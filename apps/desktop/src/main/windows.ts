// 창 세 개
//   main      홈(자료 열기·폰 연결) 이자 발표자 화면
//   audience  청중 화면. 모니터가 둘이면 노트북이 아닌 쪽에, 하나면 그 화면 전체에
//   worker    숨은 창. pdf.js 로 썸네일·장 크기를 계산한다

import { BrowserWindow, screen, type Display } from 'electron';
import path from 'node:path';

const isMac = process.platform === 'darwin';
/** 개발할 때 화면이 하나뿐이면 청중 화면이 전체를 덮어서 작업을 못 한다. 이 값이 있으면 작은 창으로 띄운다 */
export const windowedAudience = !!process.env['POINTER_WINDOWED_AUDIENCE'];
const preload = path.join(__dirname, '../preload/index.js');

/** 개발 중엔 Vite 개발 서버, 배포본에선 app:// 프로토콜로 읽는다 */
export function rendererUrl(page: 'index' | 'audience' | 'worker'): string {
  const dev = process.env['ELECTRON_RENDERER_URL'];
  return dev ? `${dev}/${page}.html` : `app://pointer/${page}.html`;
}

const secure = {
  preload,
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false,
  spellcheck: false,
};

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    show: false,
    backgroundColor: '#0b0b0c',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    // 신호등 버튼(지름 12) 가운데를 제목 줄(높이 56) 가운데 28 에 맞춘다
    trafficLightPosition: { x: 20, y: 22 },
    autoHideMenuBar: !isMac,
    webPreferences: secure,
  });
  win.once('ready-to-show', () => win.show());
  void win.loadURL(rendererUrl('index'));
  return win;
}

export function createWorkerWindow(): BrowserWindow {
  const win = new BrowserWindow({
    show: false,
    width: 400,
    height: 300,
    // 숨은 창은 타이머·그리기가 느려진다. 썸네일은 계속 그려야 하니 끈다.
    webPreferences: { ...secure, backgroundThrottling: false },
  });
  void win.loadURL(rendererUrl('worker'));
  return win;
}

/**
 * 청중 화면을 띄울 모니터: 발표자 화면(main 창)이 없는 쪽.
 * 사용자가 "화면 바꾸기" 로 고른 모니터가 아직 연결돼 있으면 그걸 먼저 쓴다.
 */
export function pickAudienceDisplay(main: BrowserWindow | null, preferredId: number | null = null): Display {
  const all = screen.getAllDisplays();
  if (all.length === 1 || !main) return screen.getPrimaryDisplay();
  const presenterDisplay = screen.getDisplayMatching(main.getBounds());
  const preferred = all.find((d) => d.id === preferredId && d.id !== presenterDisplay.id);
  if (preferred) return preferred;
  // 내장 화면이 아닌 것 중 가장 큰 것 (보통 프로젝터·TV)
  const others = all.filter((d) => d.id !== presenterDisplay.id);
  return others.sort((a, b) => b.size.width * b.size.height - a.size.width * a.size.height)[0] ?? presenterDisplay;
}

export function createAudienceWindow(display: Display): BrowserWindow {
  const win = new BrowserWindow({
    ...(windowedAudience ? { width: 960, height: 540 } : display.bounds),
    show: false,
    frame: windowedAudience,
    backgroundColor: '#000000',
    // 모니터가 하나면 발표자 화면 위를 덮는다. 둘이면 프로젝터 쪽에 따로 뜬다.
    alwaysOnTop: false,
    skipTaskbar: false,
    webPreferences: { ...secure, backgroundThrottling: false },
  });
  win.once('ready-to-show', () => {
    win.show();
    if (!windowedAudience) fillDisplay(win, display);
  });
  void win.loadURL(rendererUrl('audience'));
  return win;
}

/** 맥은 Space 전환 애니메이션이 없는 simple fullscreen 이 발표에 맞다 */
export function fillDisplay(win: BrowserWindow, display: Display) {
  if (isMac) {
    if (win.isSimpleFullScreen()) win.setSimpleFullScreen(false);
    win.setBounds(display.bounds);
    win.setSimpleFullScreen(true);
  } else {
    if (win.isFullScreen()) win.setFullScreen(false);
    win.setBounds(display.bounds);
    win.setFullScreen(true);
  }
}
