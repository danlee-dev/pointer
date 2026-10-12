// 폰(리모컨) <-> 데스크톱 앱이 WebSocket 으로 주고받는 메시지.
// 데스크톱 main, 안드로이드 웹 리모컨, iOS 앱이 모두 이 파일 하나를 기준으로 맞춘다.
// 메시지 모양을 바꾸면 PROTOCOL_VERSION 을 올린다.

export const PROTOCOL_VERSION = 1;
export const DEFAULT_PORT = 4747;

export type Platform = 'ios' | 'android' | 'web' | 'desktop';
export type Blank = 'none' | 'black' | 'white';
export type Tool = 'laser' | 'spotlight' | 'magnify' | 'pen';
export type PenColor = 'red' | 'yellow' | 'blue' | 'white';

export const TOOLS: readonly Tool[] = ['laser', 'spotlight', 'magnify', 'pen'];
export const PEN_COLORS: readonly PenColor[] = ['red', 'yellow', 'blue', 'white'];

/**
 * 청중 화면에 잠깐 띄우는 연출 (소리 + 애니메이션).
 * 누르는 순간 on:true, 떼는 순간 on:false 를 보낸다. 누르고 있는 동안 계속 이어지고
 * (두구두구, 박수, 꽃가루, 불꽃), 떼면 마무리한다 (두구두구는 '짠').
 * 마이크 드롭·정답·오답은 한 번 재생하고 끝나서 떼는 신호를 무시한다.
 */
export type Cue = 'confetti' | 'drumroll' | 'applause' | 'fireworks' | 'micdrop' | 'correct' | 'wrong';
export const CUES: readonly Cue[] = ['confetti', 'drumroll', 'applause', 'fireworks', 'micdrop', 'correct', 'wrong'];

/** 장 하나의 크기. 단위는 상관없고 비율만 쓴다 (PDF 는 pt, 이미지는 px). */
export interface PageSize {
  w: number;
  h: number;
}

export interface DeckInfo {
  /** 파일 내용으로 만든 해시. 썸네일 URL·메모 저장 키로 쓴다. */
  id: string;
  title: string;
  kind: 'pdf' | 'images';
  pages: PageSize[];
}

export interface TimerState {
  running: boolean;
  /** running 일 때 시작 시각 (데스크톱 시계 기준 epoch ms) */
  startedAt: number | null;
  /** startedAt 이전까지 쌓인 시간 */
  elapsedMs: number;
  /** 목표 발표 시간. null 이면 그냥 경과 시간만 센다 */
  targetMs: number | null;
}

export interface PresentationState {
  deck: DeckInfo | null;
  index: number;
  blank: Blank;
  /** 청중 화면이 떠 있는지 */
  presenting: boolean;
  timer: TimerState;
  /** 현재 장의 발표 메모 */
  notes: string;
  /** 이 상태를 보낸 순간의 데스크톱 시계. 폰 시계와의 차이를 보정하는 데 쓴다 */
  now: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  platform: Platform;
}

// ---------- 폰 -> 데스크톱 ----------

export type ClientMessage =
  | { t: 'hello'; v: number; device: DeviceInfo }
  | { t: 'nav'; dir: 1 | -1 }
  | { t: 'goto'; index: number }
  | { t: 'blank'; blank: Blank }
  | { t: 'pointer'; tool: Exclude<Tool, 'pen'>; on: boolean; x: number; y: number }
  | { t: 'stroke'; id: string; color: PenColor; pts: number[]; end: boolean }
  | { t: 'clearInk' }
  | { t: 'timer'; action: 'start' | 'pause' | 'reset' }
  | { t: 'timerTarget'; ms: number | null }
  | { t: 'cue'; cue: Cue; on: boolean }
  | { t: 'ping'; at: number };

// ---------- 데스크톱 -> 폰 ----------

export type ServerMessage =
  | { t: 'welcome'; v: number }
  | { t: 'state'; state: PresentationState }
  | { t: 'pong'; at: number }
  | { t: 'bye'; reason: 'revoked' | 'version' | 'replaced' };

// ---------- 들어온 메시지 검사 ----------
// 같은 와이파이의 아무나 보낼 수 있는 입력이다. 모양이 틀리면 버린다.

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isUnit = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
const isStr = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

const PLATFORMS: readonly Platform[] = ['ios', 'android', 'web', 'desktop'];
const BLANKS: readonly Blank[] = ['none', 'black', 'white'];
const POINTER_TOOLS = ['laser', 'spotlight', 'magnify'] as const;
const MAX_STROKE_POINTS = 512; // 한 번에 보내는 좌표 수 (x,y 쌍 256개)
const MAX_TARGET_MS = 24 * 60 * 60 * 1000;

export function parseClientMessage(raw: string): ClientMessage | null {
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(m)) return null;

  switch (m.t) {
    case 'hello': {
      const d = m.device;
      if (typeof m.v !== 'number' || !isObj(d)) return null;
      if (!isStr(d.id, 64) || !isStr(d.name, 80) || !oneOf(PLATFORMS, d.platform)) return null;
      return { t: 'hello', v: m.v, device: { id: d.id, name: d.name, platform: d.platform } };
    }
    case 'nav':
      return m.dir === 1 || m.dir === -1 ? { t: 'nav', dir: m.dir } : null;
    case 'goto':
      return Number.isInteger(m.index) && (m.index as number) >= 0
        ? { t: 'goto', index: m.index as number }
        : null;
    case 'blank':
      return oneOf(BLANKS, m.blank) ? { t: 'blank', blank: m.blank } : null;
    case 'pointer':
      if (!oneOf(POINTER_TOOLS, m.tool) || typeof m.on !== 'boolean') return null;
      if (!isUnit(m.x) || !isUnit(m.y)) return null;
      return { t: 'pointer', tool: m.tool, on: m.on, x: m.x, y: m.y };
    case 'stroke': {
      const pts = m.pts;
      if (!isStr(m.id, 64) || !oneOf(PEN_COLORS, m.color) || typeof m.end !== 'boolean') return null;
      if (!Array.isArray(pts) || pts.length % 2 !== 0 || pts.length > MAX_STROKE_POINTS) return null;
      if (!pts.every(isUnit)) return null;
      return { t: 'stroke', id: m.id, color: m.color, pts: pts as number[], end: m.end };
    }
    case 'clearInk':
      return { t: 'clearInk' };
    case 'timer':
      return m.action === 'start' || m.action === 'pause' || m.action === 'reset'
        ? { t: 'timer', action: m.action }
        : null;
    case 'timerTarget':
      if (m.ms === null) return { t: 'timerTarget', ms: null };
      return Number.isInteger(m.ms) && (m.ms as number) > 0 && (m.ms as number) <= MAX_TARGET_MS
        ? { t: 'timerTarget', ms: m.ms as number }
        : null;
    case 'cue':
      return oneOf(CUES, m.cue) && typeof m.on === 'boolean' ? { t: 'cue', cue: m.cue, on: m.on } : null;
    case 'ping':
      return typeof m.at === 'number' && Number.isFinite(m.at) ? { t: 'ping', at: m.at } : null;
    default:
      return null;
  }
}

export * from './timer';
export * from './url';
