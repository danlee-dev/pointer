// 발표 상태의 단일 출처. 폰·데스크톱 화면·키보드가 보낸 명령이 전부 여기서 반영된다.
// Electron 에 의존하지 않는 순수 함수라 vitest 로 바로 검사한다.

import {
  IDLE_TIMER,
  timerPause,
  timerReset,
  timerStart,
  type Blank,
  type DeckInfo,
  type TimerState,
} from '@pointer/protocol';
import type { DesktopCommand } from '../shared/ipc';

export interface Session {
  deck: DeckInfo | null;
  index: number;
  blank: Blank;
  presenting: boolean;
  timer: TimerState;
}

export const EMPTY_SESSION: Session = {
  deck: null,
  index: 0,
  blank: 'none',
  presenting: false,
  timer: IDLE_TIMER,
};

export type SessionAction =
  | DesktopCommand
  | { t: 'openDeck'; deck: DeckInfo }
  | { t: 'closeDeck' }
  | { t: 'presenting'; on: boolean };

const isIdle = (t: TimerState) => !t.running && t.elapsedMs === 0;

export function reduce(s: Session, a: SessionAction, now: number): Session {
  const last = s.deck ? s.deck.pages.length - 1 : 0;
  const clamp = (n: number) => Math.max(0, Math.min(last, n));

  switch (a.t) {
    case 'nav': {
      if (!s.deck) return s;
      // 가린 상태에서 넘기기를 누르면 장은 그대로 두고 화면만 다시 켠다 (PowerPoint 와 같은 동작).
      if (s.blank !== 'none') return { ...s, blank: 'none' };
      const index = clamp(s.index + a.dir);
      // 타이머는 처음 넘길 때 자동으로 시작한다. 한 번이라도 손댄 타이머는 건드리지 않는다.
      const timer = isIdle(s.timer) && index !== s.index ? timerStart(s.timer, now) : s.timer;
      return { ...s, index, timer };
    }
    case 'goto':
      if (!s.deck) return s;
      return { ...s, index: clamp(a.index), blank: 'none' };
    case 'blank':
      return { ...s, blank: a.blank };
    case 'timer':
      if (a.action === 'start') return { ...s, timer: timerStart(s.timer, now) };
      if (a.action === 'pause') return { ...s, timer: timerPause(s.timer, now) };
      return { ...s, timer: timerReset(s.timer) };
    case 'timerTarget':
      return { ...s, timer: { ...s.timer, targetMs: a.ms } };
    case 'openDeck':
      return { ...s, deck: a.deck, index: 0, blank: 'none', timer: timerReset(s.timer) };
    case 'closeDeck':
      return { ...EMPTY_SESSION, timer: timerReset(s.timer) };
    case 'presenting':
      return { ...s, presenting: a.on, blank: a.on ? s.blank : 'none' };
    // 레이저·펜·효과는 상태가 아니라 순간 이벤트라 여기서 다루지 않는다
    case 'pointer':
    case 'stroke':
    case 'clearInk':
    case 'cue':
      return s;
  }
}

// ---------- 판서 ----------
// 지금 장에 그려진 획만 들고 있다. 장이 바뀌면 비운다.

export interface Ink {
  strokes: Map<string, { color: string; pts: number[] }>;
}

const MAX_POINTS_PER_STROKE = 20_000;
const MAX_STROKES = 500;

export function appendStroke(ink: Ink, id: string, color: string, pts: number[]): boolean {
  let s = ink.strokes.get(id);
  if (!s) {
    if (ink.strokes.size >= MAX_STROKES) return false;
    s = { color, pts: [] };
    ink.strokes.set(id, s);
  }
  if (s.pts.length + pts.length > MAX_POINTS_PER_STROKE) return false;
  s.pts.push(...pts);
  return true;
}
