// main <-> renderer IPC 계약. preload 가 이 모양 그대로 window.pointer 로 노출한다.

import type { ClientMessage, DeviceInfo, PageSize, PenColor, PresentationState, Tool } from '@pointer/protocol';
import type { Locale } from '@pointer/i18n';

/** 렌더러가 자료를 그릴 때 필요한 정보. 파일 내용은 readFile 로 따로 받는다 */
export interface DeckSource {
  id: string;
  kind: 'pdf' | 'images';
  title: string;
  /** 표시용 이름 (PDF 파일명 또는 이미지 파일명들) */
  files: string[];
}

export interface RecentItem {
  paths: string[];
  title: string;
  kind: 'pdf' | 'images';
  pages: number;
  openedAt: number;
  missing: boolean;
}

export interface ConnectionInfo {
  /** 지금 QR 에 담긴 주소. 네트워크가 없으면 null */
  url: string | null;
  qrSvg: string | null;
  addresses: string[];
  address: string | null;
  port: number;
  devices: DeviceInfo[];
}

/** 레이저·스포트라이트·돋보기 위치. 0..1, 장 기준 */
export interface PointerFx {
  tool: Exclude<Tool, 'pen'>;
  on: boolean;
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  color: PenColor;
  /** x,y 를 번갈아 담은 0..1 좌표 */
  pts: number[];
}

export type InkEvent =
  | { type: 'append'; id: string; color: PenColor; pts: number[] }
  | { type: 'clear' };

export type OpenResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'mixed' | 'unsupported' | 'noImages' | 'open' | 'canceled' | 'noConverter' | 'convertFailed' | 'convertTimeout';
    };

/** 화면 아래에 잠깐 띄우는 알림 */
export type Notice =
  | { kind: 'mirrorOff' }
  | { kind: 'converting'; via: 'powerpoint' | 'keynote' | 'libreoffice' }
  | { kind: 'converted'; notes: number }
  | { kind: 'openFailed'; reason: Exclude<OpenResult, { ok: true }>['reason'] };

/** 데스크톱 화면에서 보내는 명령. 폰 메시지와 같은 모양 (hello/ping 제외) */
export type DesktopCommand = Exclude<ClientMessage, { t: 'hello' } | { t: 'ping' }>;

/** 숨은 렌더 창 <-> main */
export interface WorkerLoadRequest {
  reqId: number;
  source: DeckSource;
  password: string | null;
}
export type WorkerLoadResult =
  | { reqId: number; ok: true; pages: PageSize[] }
  | { reqId: number; ok: false; reason: 'password' | 'wrongPassword' | 'open' };

export interface ThumbRequest {
  deckId: string;
  index: number;
}

export interface TextRequest {
  reqId: number;
  deckId: string;
  index: number;
}

/** AI(MCP) 연결 주소. 이 컴퓨터 안에서만 열린다 */
export interface AiConnection {
  url: string | null;
}

export interface DesktopApi {
  platform: 'darwin' | 'win32' | 'linux';

  // 자료
  openDialog(): Promise<OpenResult>;
  openFiles(files: File[]): Promise<OpenResult>;
  openRecent(paths: string[]): Promise<OpenResult>;
  removeRecent(paths: string[]): Promise<void>;
  getRecent(): Promise<RecentItem[]>;
  closeDeck(): void;
  getSource(): Promise<DeckSource | null>;
  /** 자료의 n번째 파일 (PDF 는 0 하나) */
  readFile(deckId: string, fileIndex: number): Promise<Uint8Array | null>;
  getPassword(deckId: string): Promise<string | null>;
  submitPassword(password: string | null): void;
  onPasswordRequest(cb: (req: { title: string; wrong: boolean } | null) => void): () => void;
  getThumb(deckId: string, index: number): Promise<Uint8Array | null>;

  // 상태
  getState(): Promise<PresentationState>;
  onState(cb: (s: PresentationState) => void): () => void;
  command(c: DesktopCommand): void;
  setNotes(deckId: string, index: number, text: string): void;

  // 발표
  startPresenting(): void;
  stopPresenting(): void;
  swapDisplays(): void;
  toggleFullscreen(): void;
  getFullscreen(): Promise<boolean>;
  onFullscreen(cb: (on: boolean) => void): () => void;
  getDisplays(): Promise<number>;
  onDisplays(cb: (count: number) => void): () => void;
  onNotice(cb: (notice: Notice) => void): () => void;
  onPointer(cb: (p: PointerFx) => void): () => void;
  onInk(cb: (e: InkEvent) => void): () => void;
  getInk(): Promise<Stroke[]>;

  // 연결
  getConnection(): Promise<ConnectionInfo>;
  onConnection(cb: (c: ConnectionInfo) => void): () => void;
  setAddress(address: string): void;
  kickDevice(id: string): void;
  rotateToken(): void;

  // 설정
  getLocale(): Promise<Locale>;
  onLocale(cb: (l: Locale) => void): () => void;

  // 숨은 렌더 창 전용
  worker: {
    onLoad(cb: (r: WorkerLoadRequest) => void): () => void;
    loaded(r: WorkerLoadResult): void;
    onThumbRequest(cb: (r: ThumbRequest) => void): () => void;
    thumbDone(deckId: string, index: number, jpeg: Uint8Array | null): void;
    onTextRequest(cb: (r: TextRequest) => void): () => void;
    textDone(reqId: number, text: string | null): void;
  };

  // AI 대본 (MCP)
  getAiConnection(): Promise<AiConnection>;
  copyText(text: string): void;
}

export const IPC = {
  openDialog: 'deck:openDialog',
  openPaths: 'deck:openPaths',
  removeRecent: 'deck:removeRecent',
  getRecent: 'deck:getRecent',
  closeDeck: 'deck:close',
  getSource: 'deck:getSource',
  readFile: 'deck:readFile',
  getPassword: 'deck:getPassword',
  submitPassword: 'deck:submitPassword',
  passwordRequest: 'deck:passwordRequest',
  getThumb: 'deck:getThumb',
  getState: 'state:get',
  state: 'state:changed',
  command: 'state:command',
  setNotes: 'state:setNotes',
  startPresenting: 'present:start',
  stopPresenting: 'present:stop',
  swapDisplays: 'present:swap',
  toggleFullscreen: 'window:toggleFullscreen',
  getFullscreen: 'window:getFullscreen',
  fullscreen: 'window:fullscreenChanged',
  getDisplays: 'displays:get',
  displays: 'displays:changed',
  notice: 'app:notice',
  pointer: 'fx:pointer',
  ink: 'fx:ink',
  getInk: 'fx:getInk',
  getConnection: 'conn:get',
  connection: 'conn:changed',
  setAddress: 'conn:setAddress',
  kickDevice: 'conn:kick',
  rotateToken: 'conn:rotate',
  getLocale: 'settings:getLocale',
  locale: 'settings:locale',
  workerLoad: 'worker:load',
  workerLoaded: 'worker:loaded',
  workerThumbRequest: 'worker:thumbRequest',
  workerThumbDone: 'worker:thumbDone',
  workerTextRequest: 'worker:textRequest',
  workerTextDone: 'worker:textDone',
  getAiConnection: 'ai:getConnection',
  copyText: 'app:copyText',
} as const;
