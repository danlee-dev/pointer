// 앱 전체 흐름을 잡는 곳. 상태(session)는 여기 한 군데만 있고,
// 바뀔 때마다 데스크톱 창들(IPC)과 폰들(WebSocket)에 같은 내용을 뿌린다.

import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  powerSaveBlocker,
  protocol,
  screen,
  type MenuItemConstructorOptions,
} from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { toString as qrToString } from 'qrcode';
import { DEFAULT_PORT, pairingUrl, type Cue, type PresentationState } from '@pointer/protocol';
import { messages, resolveLocale, type Locale } from '@pointer/i18n';
import {
  IPC,
  type AiConnection,
  type ConnectionInfo,
  type DesktopCommand,
  type CueEvent,
  type InkEvent,
  type Notice,
  type OpenResult,
  type PointerFx,
  type RecentItem,
  type Stroke,
  type WorkerLoadResult,
} from '../shared/ipc';
import { IMAGE_EXT, inspectPaths, type OpenedDeck } from './deck';
import { convertPresentation, isPresentation, PRESENTATION_EXT } from './convert';
import { lanAddresses } from './network';
import { createRemoteServer } from './server';
import { appendStroke, EMPTY_SESSION, reduce, type Ink, type Session, type SessionAction } from './session';
import { aiToken, notes, recent, settings, token } from './store';
import { createMcpServer, DEFAULT_MCP_PORT } from './mcp';
import { createThumbCache } from './thumbs';
import { restoreMirror, restoreMirrorSync, unmirrorForPresenting, type MirrorSnapshot } from './displayMode';
import {
  createAudienceWindow,
  createMainWindow,
  createWorkerWindow,
  fillDisplay,
  pickAudienceDisplay,
  windowedAudience,
} from './windows';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true } },
]);

if (!app.requestSingleInstanceLock()) app.quit();

let mainWin: BrowserWindow | null = null;
let audienceWin: BrowserWindow | null = null;
let workerWin: BrowserWindow | null = null;
let workerReady: Promise<void> = Promise.resolve();

let session: Session = EMPTY_SESSION;
/** 지금 열려 있는 자료 */
let opened: OpenedDeck | null = null;
let openedPassword: string | null = null;
/** 여는 중인 자료 (worker 가 아직 읽는 중) */
let loading: { deck: OpenedDeck; password: string | null } | null = null;
const ink: Ink = { strokes: new Map() };
let powerBlocker: number | null = null;
/** 발표 때문에 미러링을 꺼 뒀으면 끝날 때 되돌릴 원래 상태 */
let mirrorSnapshot: MirrorSnapshot | null = null;
let starting = false;

let port = DEFAULT_PORT;
let pairingToken = '';
let addresses: string[] = [];
let pendingOpen: string[] | null = null;

const live = (w: BrowserWindow | null): w is BrowserWindow => !!w && !w.isDestroyed();
function toWindows(channel: string, payload: unknown) {
  for (const w of [mainWin, audienceWin]) if (live(w)) w.webContents.send(channel, payload);
}

function locale(): Locale {
  const pref = settings.get().language;
  return pref === 'system' ? resolveLocale(app.getPreferredSystemLanguages()[0] ?? app.getLocale()) : pref;
}

// ---------- 상태 ----------

function presentationState(): PresentationState {
  return {
    deck: session.deck,
    index: session.index,
    blank: session.blank,
    presenting: session.presenting,
    timer: session.timer,
    notes: session.deck ? notes.get(session.deck.id, session.index) : '',
    now: Date.now(),
  };
}

function publishState() {
  toWindows(IPC.state, presentationState());
  server.broadcastState();
}

function dispatch(action: SessionAction) {
  const prev = session;
  session = reduce(session, action, Date.now());
  if (session === prev) return;
  // 판서는 그 장에만 남는다
  if (session.index !== prev.index || session.deck?.id !== prev.deck?.id) clearInk();
  publishState();
}

function clearInk() {
  if (ink.strokes.size === 0) return;
  ink.strokes.clear();
  toWindows(IPC.ink, { type: 'clear' } satisfies InkEvent);
}

function handleCommand(c: DesktopCommand) {
  switch (c.t) {
    case 'pointer':
      toWindows(IPC.pointer, { tool: c.tool, on: c.on, x: c.x, y: c.y } satisfies PointerFx);
      return;
    case 'stroke':
      if (session.deck && appendStroke(ink, c.id, c.color, c.pts)) {
        toWindows(IPC.ink, { type: 'append', id: c.id, color: c.color, pts: c.pts } satisfies InkEvent);
      }
      return;
    case 'clearInk':
      clearInk();
      return;
    case 'cue':
      cue(c.cue, c.on);
      return;
    default:
      dispatch(c);
  }
}

// ---------- 효과 ----------
// 누르고 있는 효과는 떼는 신호가 와야 끝난다. 폰이 끊기거나 신호를 놓쳐도
// 화면에서 두구두구가 영원히 울리지 않게 20초 뒤엔 저절로 마무리한다.

const MAX_CUE_HOLD_MS = 20_000;
const heldCues = new Map<Cue, ReturnType<typeof setTimeout>>();

function cue(name: Cue, on: boolean) {
  const held = heldCues.get(name);
  if (held) clearTimeout(held);
  heldCues.delete(name);
  if (on) heldCues.set(name, setTimeout(() => cue(name, false), MAX_CUE_HOLD_MS));
  else if (!held) return; // 이미 마무리된 효과
  // 소리는 한 창에서만 낸다. 청중 창이 있으면 거기 (프로젝터·TV 스피커로 나가게)
  const audioWin = live(audienceWin) ? audienceWin : mainWin;
  for (const w of [mainWin, audienceWin]) {
    if (live(w)) w.webContents.send(IPC.cue, { cue: name, on, audio: w === audioWin } satisfies CueEvent);
  }
}

function releaseCues() {
  for (const name of [...heldCues.keys()]) cue(name, false);
}

// ---------- 폰 서버 ----------

const remoteWebDir = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'remote-web')
    : path.join(app.getAppPath(), '../../packages/remote-web/dist');

const thumbs = createThumbCache((deckId, index) => {
  if (live(workerWin)) workerWin.webContents.send(IPC.workerThumbRequest, { deckId, index });
});

const server = createRemoteServer({
  staticDir: remoteWebDir(),
  getToken: () => pairingToken,
  getThumb: (deckId, index) => thumbs.get(deckId, index),
  getState: presentationState,
  onMessage: (_device, msg) => {
    if (msg.t !== 'hello' && msg.t !== 'ping') handleCommand(msg);
  },
  onDevicesChanged: () => void publishConnection(),
  // 손가락을 댄 채로 폰이 잠기면 레이저가 화면에 남는다. 누르고 있던 효과도 마무리한다.
  onDeviceGone: () => {
    toWindows(IPC.pointer, { tool: 'laser', on: false, x: 0, y: 0 } satisfies PointerFx);
    releaseCues();
  },
});

// ---------- AI (MCP) ----------

let mcpPort = DEFAULT_MCP_PORT;
let textSeq = 0;
const pendingText = new Map<number, (t: string | null) => void>();

/** 장 글자는 pdf.js 가 있는 숨은 렌더 창에서 꺼낸다 */
function slideText(index: number): Promise<string | null> {
  const deckId = session.deck?.id;
  if (!deckId || !live(workerWin)) return Promise.resolve(null);
  const reqId = ++textSeq;
  return new Promise((resolve) => {
    pendingText.set(reqId, resolve);
    workerWin?.webContents.send(IPC.workerTextRequest, { reqId, deckId, index });
    setTimeout(() => {
      if (pendingText.delete(reqId)) resolve(null);
    }, 15_000);
  });
}

/** 메모를 쓰고, 지금 보고 있는 장이면 발표자 화면·폰에 바로 보낸다 */
function writeNotes(index: number, text: string) {
  if (!session.deck) return;
  notes.set(session.deck.id, index, text);
  if (index === session.index) publishState();
}

const mcp = createMcpServer({
  getToken: () => aiToken.get(),
  info: () =>
    session.deck
      ? { title: session.deck.title, slides: session.deck.pages.length, current: session.index, presenting: session.presenting }
      : null,
  getText: slideText,
  getImage: (index) => (session.deck ? thumbs.get(session.deck.id, index) : Promise.resolve(null)),
  getNotes: (index) => (session.deck ? notes.get(session.deck.id, index) : ''),
  setNotes: writeNotes,
  goTo: (index) => dispatch({ t: 'goto', index }),
});

const aiConnection = (): AiConnection => ({ url: `http://127.0.0.1:${mcpPort}/mcp?k=${aiToken.get()}` });

async function connectionInfo(): Promise<ConnectionInfo> {
  const chosen = settings.get().address;
  const address = chosen && addresses.includes(chosen) ? chosen : (addresses[0] ?? null);
  const url = address ? pairingUrl({ host: address, port, token: pairingToken }) : null;
  const qrSvg = url ? await qrToString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }) : null;
  return { url, qrSvg, addresses, address, port, devices: server.devices() };
}

async function publishConnection() {
  if (live(mainWin)) mainWin.webContents.send(IPC.connection, await connectionInfo());
}

function rotateToken() {
  pairingToken = token.rotate();
  server.dropAll();
  void publishConnection();
}

// ---------- 자료 열기 ----------

let loadSeq = 0;
const pendingLoads = new Map<number, (r: WorkerLoadResult) => void>();

async function workerLoad(deck: OpenedDeck, password: string | null): Promise<WorkerLoadResult> {
  await workerReady;
  const reqId = ++loadSeq;
  return new Promise((resolve) => {
    pendingLoads.set(reqId, resolve);
    workerWin?.webContents.send(IPC.workerLoad, { reqId, source: deck.source, password });
    setTimeout(() => {
      if (pendingLoads.delete(reqId)) resolve({ reqId, ok: false, reason: 'open' });
    }, 60_000);
  });
}

let passwordAnswer: ((pw: string | null) => void) | null = null;
function askPassword(title: string, wrong: boolean): Promise<string | null> {
  passwordAnswer?.(null);
  return new Promise((resolve) => {
    passwordAnswer = resolve;
    if (live(mainWin)) mainWin.webContents.send(IPC.passwordRequest, { title, wrong });
  });
}

function notice(n: Notice) {
  if (live(mainWin)) mainWin.webContents.send(IPC.notice, n);
}

/**
 * PowerPoint·Keynote 파일이면 PDF 로 바꿔서 연다. 원래 파일 이름을 제목으로, 원래 경로를 최근 목록에 남긴다.
 * 노트는 자료가 열린 뒤 비어 있는 장에만 채운다 (사용자가 쓴 메모를 덮지 않는다).
 */
async function openPaths(paths: string[]): Promise<OpenResult> {
  if (paths.some(isPresentation)) {
    if (paths.length > 1) return { ok: false, reason: 'mixed' };
    const src = paths[0]!;
    const conv = await convertPresentation(src, (via) => notice({ kind: 'converting', via }));
    if (!conv.ok) return { ok: false, reason: conv.reason };
    const r = await openPaths([conv.pdf]);
    if (!r.ok || !opened) return r;
    const title = path.basename(src, path.extname(src));
    opened.source.title = title;
    opened.picked = [src];
    if (session.deck) dispatch({ t: 'openDeck', deck: { ...session.deck, title } });
    recent.replaceLatest([conv.pdf], { paths: [src], title });
    const imported = importNotes(opened.source.id, conv.notes, session.deck?.pages.length ?? 0);
    notice({ kind: 'converted', notes: imported });
    return r;
  }

  const deck = await inspectPaths(paths);
  if (typeof deck === 'string') return { ok: false, reason: deck };

  loading = { deck, password: null };
  thumbs.reset(deck.source.id);
  let res = await workerLoad(deck, null);
  while (!res.ok && (res.reason === 'password' || res.reason === 'wrongPassword')) {
    const pw = await askPassword(deck.source.title, res.reason === 'wrongPassword');
    if (pw === null) break;
    loading = { deck, password: pw };
    res = await workerLoad(deck, pw);
  }

  if (!res.ok) {
    // 실패하면 worker 를 원래 자료로 되돌린다
    loading = null;
    thumbs.reset(opened?.source.id ?? null);
    if (opened) void workerLoad(opened, openedPassword);
    const canceled = res.reason === 'password' || res.reason === 'wrongPassword';
    return { ok: false, reason: canceled ? 'canceled' : 'open' };
  }

  opened = deck;
  openedPassword = loading?.password ?? null;
  loading = null;
  const { id, title, kind } = deck.source;
  dispatch({ t: 'openDeck', deck: { id, title, kind, pages: res.pages } });
  recent.add({ paths: deck.picked, title, kind, pages: res.pages.length, openedAt: Date.now() });
  return { ok: true };
}

/**
 * 창 밖에서 들어온 열기 (Finder "다음으로 열기", 아이콘에 끌어 놓기, 두 번째 실행).
 * 창에서 연 경우와 달리 결과를 받을 곳이 없으니 실패를 알림으로 보낸다. 안 그러면 "변환 중" 표시가 남는다.
 */
async function openFromOutside(paths: string[]) {
  const r = await openPaths(paths);
  if (!r.ok) notice({ kind: 'openFailed', reason: r.reason });
}

/** 변환기가 준 노트를 비어 있는 장에만 넣는다. 장 수가 다르면 어긋날 수 있어 넣지 않는다 */
function importNotes(deckId: string, list: string[] | null, pages: number): number {
  if (!list || list.length !== pages) return 0;
  let n = 0;
  list.forEach((text, i) => {
    if (text.trim() && !notes.get(deckId, i).trim()) {
      notes.set(deckId, i, text);
      n += 1;
    }
  });
  if (n > 0) publishState();
  return n;
}

function closeDeck() {
  stopPresenting();
  opened = null;
  openedPassword = null;
  thumbs.reset(null);
  dispatch({ t: 'closeDeck' });
}

async function openDialog(): Promise<OpenResult> {
  if (!live(mainWin)) return { ok: false, reason: 'canceled' };
  const t = messages(locale());
  const r = await dialog.showOpenDialog(mainWin, {
    title: t.home.open,
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'PDF, PowerPoint, Keynote, Images',
        extensions: ['pdf', ...PRESENTATION_EXT.map((e) => e.slice(1)), ...IMAGE_EXT.map((e) => e.slice(1))],
      },
    ],
  });
  if (r.canceled || r.filePaths.length === 0) return { ok: false, reason: 'canceled' };
  return openPaths(r.filePaths);
}

async function recentItems(): Promise<RecentItem[]> {
  return Promise.all(
    recent.list().map(async (e) => {
      const exists = await Promise.all(e.paths.map((p) => fs.access(p).then(() => true, () => false)));
      return { ...e, missing: !exists.every(Boolean) };
    }),
  );
}

// ---------- 발표 ----------

async function startPresenting() {
  if (!session.deck || starting) return;
  if (live(audienceWin)) return audienceWin.focus();
  starting = true;
  try {
    // 미러링 중이면 노트북에 발표자 화면을 따로 띄울 수 없다. 발표하는 동안만 확장 모드로 바꾼다.
    if (!windowedAudience) {
      mirrorSnapshot = await unmirrorForPresenting();
      if (mirrorSnapshot) notice({ kind: 'mirrorOff' });
    }

    const twoScreens = screen.getAllDisplays().length > 1;
    const win = createAudienceWindow(pickAudienceDisplay(mainWin, settings.get().audienceDisplay));
    audienceWin = win;
    win.on('closed', () => {
      if (audienceWin === win) audienceWin = null;
      if (powerBlocker !== null) powerSaveBlocker.stop(powerBlocker);
      powerBlocker = null;
      dispatch({ t: 'presenting', on: false });
      if (mirrorSnapshot) {
        const snap = mirrorSnapshot;
        mirrorSnapshot = null;
        void restoreMirror(snap);
      }
    });
    // 모니터가 둘 이상이면 키보드 입력은 발표자 화면(노트북)에 남겨 둔다
    if (twoScreens) win.once('show', () => mainWin?.focus());
    powerBlocker = powerSaveBlocker.start('prevent-display-sleep');
    dispatch({ t: 'presenting', on: true });
  } finally {
    starting = false;
  }
}

function stopPresenting() {
  if (live(audienceWin)) audienceWin.close();
}

/**
 * 청중 화면을 다음 모니터로 옮긴다. 모니터가 둘이면 발표자 화면과 맞바꾸는 것과 같다.
 * 고른 모니터는 기억해 두고 다음 발표 때 먼저 쓴다 (외부 모니터가 여러 대인 책상).
 */
function swapDisplays() {
  if (!live(audienceWin) || !live(mainWin)) return;
  const all = screen.getAllDisplays();
  if (all.length < 2) return;
  const aud = screen.getDisplayMatching(audienceWin.getBounds());
  const pres = screen.getDisplayMatching(mainWin.getBounds());
  const next = all[(all.findIndex((d) => d.id === aud.id) + 1) % all.length]!;
  if (next.id === pres.id) {
    const area = aud.workArea;
    const [w, h] = mainWin.getSize() as [number, number];
    mainWin.setBounds({
      x: Math.round(area.x + (area.width - Math.min(w, area.width)) / 2),
      y: Math.round(area.y + (area.height - Math.min(h, area.height)) / 2),
      width: Math.min(w, area.width),
      height: Math.min(h, area.height),
    });
  }
  if (!windowedAudience) fillDisplay(audienceWin, next);
  settings.set({ audienceDisplay: next.id });
  mainWin.focus();
}

function publishDisplays() {
  if (live(mainWin)) mainWin.webContents.send(IPC.displays, screen.getAllDisplays().length);
}

function onDisplaysChanged() {
  publishDisplays();
  // 확장 모드로 바꾸는 중에 생기는 화면 변화는 startPresenting 이 처리한다
  if (starting) return;
  if (live(audienceWin) && !windowedAudience) fillDisplay(audienceWin, pickAudienceDisplay(mainWin, settings.get().audienceDisplay));
}

// ---------- 메뉴 ----------

function rebuildMenu() {
  const t = messages(locale());
  const lang = settings.get().language;
  const setLang = (language: 'system' | 'ko' | 'en') => () => {
    settings.set({ language });
    rebuildMenu();
    toWindows(IPC.locale, locale());
  };
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    {
      label: t.menu.file,
      submenu: [
        { label: t.menu.open, accelerator: 'CmdOrCtrl+O', click: () => void openDialog() },
        { label: t.menu.closeDeck, accelerator: 'CmdOrCtrl+Shift+W', click: closeDeck },
        { type: 'separator' },
        { label: t.menu.present, accelerator: 'CmdOrCtrl+Enter', click: () => void startPresenting() },
        { label: t.menu.stop, click: stopPresenting },
        { type: 'separator' },
        { label: t.menu.newQr, click: rotateToken },
        ...(process.platform === 'darwin' ? [] : [{ type: 'separator' as const }, { role: 'quit' as const }]),
      ],
    },
    // 메모 입력칸에서 복사·붙여넣기가 되려면 맥은 Edit 메뉴가 꼭 있어야 한다
    { role: 'editMenu' },
    {
      label: t.menu.view,
      submenu: [
        {
          label: t.menu.language,
          submenu: [
            { label: t.settings.system, type: 'radio', checked: lang === 'system', click: setLang('system') },
            { label: '한국어', type: 'radio', checked: lang === 'ko', click: setLang('ko') },
            { label: 'English', type: 'radio', checked: lang === 'en', click: setLang('en') },
          ],
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'reload' as const }, { role: 'toggleDevTools' as const }]),
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- IPC ----------

const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8,64}$/.test(v);
const isIndex = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

function registerIpc() {
  ipcMain.handle(IPC.openDialog, () => openDialog());
  ipcMain.handle(IPC.openPaths, (_e, paths: unknown) =>
    Array.isArray(paths) && paths.length > 0 && paths.every((p) => typeof p === 'string')
      ? openPaths(paths)
      : { ok: false, reason: 'unsupported' },
  );
  ipcMain.handle(IPC.removeRecent, (_e, paths: string[]) => recent.remove(paths));
  ipcMain.handle(IPC.getRecent, () => recentItems());
  ipcMain.on(IPC.closeDeck, closeDeck);
  ipcMain.handle(IPC.getSource, () => opened?.source ?? null);
  ipcMain.handle(IPC.readFile, async (_e, deckId: unknown, fileIndex: unknown) => {
    if (!isId(deckId) || !isIndex(fileIndex)) return null;
    const deck = opened?.source.id === deckId ? opened : loading?.deck.source.id === deckId ? loading.deck : null;
    const file = deck?.files[fileIndex];
    return file ? new Uint8Array(await fs.readFile(file)) : null;
  });
  ipcMain.handle(IPC.getPassword, (_e, deckId: unknown) => {
    if (opened?.source.id === deckId) return openedPassword;
    const l = loading;
    return l && l.deck.source.id === deckId ? l.password : null;
  });
  ipcMain.on(IPC.submitPassword, (_e, pw: unknown) => {
    const answer = passwordAnswer;
    passwordAnswer = null;
    if (live(mainWin)) mainWin.webContents.send(IPC.passwordRequest, null);
    answer?.(typeof pw === 'string' ? pw : null);
  });
  ipcMain.handle(IPC.getThumb, async (_e, deckId: unknown, index: unknown) => {
    if (!isId(deckId) || !isIndex(index)) return null;
    const buf = await thumbs.get(deckId, index);
    return buf ? new Uint8Array(buf) : null;
  });

  ipcMain.handle(IPC.getState, () => presentationState());
  ipcMain.on(IPC.command, (_e, c: DesktopCommand) => handleCommand(c));
  ipcMain.on(IPC.setNotes, (_e, deckId: unknown, index: unknown, text: unknown) => {
    if (!isId(deckId) || !isIndex(index) || typeof text !== 'string' || text.length > 20_000) return;
    notes.set(deckId, index, text);
    if (session.deck?.id === deckId && session.index === index) server.broadcastState();
  });

  ipcMain.on(IPC.startPresenting, () => void startPresenting());
  ipcMain.on(IPC.stopPresenting, stopPresenting);
  ipcMain.on(IPC.swapDisplays, swapDisplays);
  ipcMain.handle(IPC.getDisplays, () => screen.getAllDisplays().length);
  ipcMain.handle(IPC.getFullscreen, () => (live(mainWin) ? mainWin.isFullScreen() : false));
  // 발표자 화면(main 창)만 전체화면을 켜고 끈다. 청중 화면은 원래 전체화면이다.
  ipcMain.on(IPC.toggleFullscreen, (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w && w === mainWin) w.setFullScreen(!w.isFullScreen());
  });
  ipcMain.handle(IPC.getInk, (): Stroke[] =>
    [...ink.strokes].map(([id, s]) => ({ id, color: s.color as Stroke['color'], pts: s.pts })),
  );

  ipcMain.handle(IPC.getConnection, () => connectionInfo());
  ipcMain.on(IPC.setAddress, (_e, address: unknown) => {
    if (typeof address === 'string' && addresses.includes(address)) {
      settings.set({ address });
      void publishConnection();
    }
  });
  ipcMain.on(IPC.kickDevice, (_e, id: unknown) => typeof id === 'string' && server.kick(id));
  ipcMain.on(IPC.rotateToken, rotateToken);
  ipcMain.handle(IPC.getLocale, () => locale());

  ipcMain.on(IPC.workerLoaded, (_e, r: WorkerLoadResult) => {
    pendingLoads.get(r.reqId)?.(r);
    pendingLoads.delete(r.reqId);
  });
  ipcMain.on(IPC.workerTextDone, (_e, reqId: number, text: string | null) => {
    pendingText.get(reqId)?.(text);
    pendingText.delete(reqId);
  });
  ipcMain.handle(IPC.getAiConnection, () => aiConnection());
  ipcMain.on(IPC.copyText, (_e, text: unknown) => {
    if (typeof text === 'string' && text.length < 10_000) clipboard.writeText(text);
  });
  ipcMain.on(IPC.workerThumbDone, (_e, deckId: string, index: number, jpeg: Uint8Array | null) => {
    thumbs.put(deckId, index, jpeg ? Buffer.from(jpeg) : null);
  });
}

// ---------- 앱 ----------

/** 배포본은 app:// 로 화면 파일을 읽는다 (file:// 은 fetch·모듈 워커가 막힌다) */
function registerAppProtocol() {
  const root = path.join(__dirname, '../renderer');
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.json': 'application/json',
  };
  protocol.handle('app', async (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname);
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root + path.sep)) return new Response(null, { status: 404 });
    try {
      const body = await fs.readFile(file);
      const type = types[path.extname(file)] ?? 'application/octet-stream';
      return new Response(body, { headers: { 'Content-Type': type } });
    } catch {
      return new Response(null, { status: 404 });
    }
  });
}

function filesFromArgv(argv: string[]): string[] {
  return argv
    .slice(app.isPackaged ? 1 : 2)
    .filter((a) => !a.startsWith('-') && (/\.(pdf|png|jpe?g|webp|gif)$/i.test(a) || isPresentation(a)));
}

app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (e) => e.preventDefault());
});

app.on('second-instance', (_e, argv) => {
  if (live(mainWin)) {
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.focus();
  }
  const files = filesFromArgv(argv);
  if (files.length) void openFromOutside(files);
});

// 맥에서 PDF 를 앱 아이콘에 끌어 놓거나 "다음으로 열기" 했을 때
app.on('open-file', (e, file) => {
  e.preventDefault();
  if (app.isReady() && live(workerWin)) void openFromOutside([file]);
  else pendingOpen = [file];
});

app.whenReady().then(async () => {
  registerAppProtocol();
  registerIpc();

  pairingToken = token.get();
  addresses = lanAddresses();
  port = await server.listen(DEFAULT_PORT);
  mcpPort = await mcp.listen(DEFAULT_MCP_PORT);

  workerWin = createWorkerWindow();
  const w = workerWin;
  workerReady = new Promise((resolve) => w.webContents.once('did-finish-load', () => resolve()));

  mainWin = createMainWindow();
  // 전체화면 버튼 글자와 제목 줄 여백(맥 신호등 자리)을 바꾸려고 상태를 알려 준다
  mainWin.on('enter-full-screen', () => mainWin?.webContents.send(IPC.fullscreen, true));
  mainWin.on('leave-full-screen', () => mainWin?.webContents.send(IPC.fullscreen, false));
  mainWin.on('closed', () => {
    mainWin = null;
    app.quit();
  });
  rebuildMenu();

  // 와이파이를 바꾸거나 핫스팟에 붙으면 주소가 바뀐다. QR 을 새 주소로 갈아 끼운다.
  setInterval(() => {
    const now = lanAddresses();
    if (now.join() !== addresses.join()) {
      addresses = now;
      void publishConnection();
    }
  }, 4000);

  screen.on('display-added', onDisplaysChanged);
  screen.on('display-removed', onDisplaysChanged);

  const initial = pendingOpen ?? filesFromArgv(process.argv);
  pendingOpen = null;
  if (initial.length) void openFromOutside(initial);
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  server.close();
  mcp.close();
  if (mirrorSnapshot) restoreMirrorSync(mirrorSnapshot);
  mirrorSnapshot = null;
});
