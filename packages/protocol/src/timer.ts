import type { TimerState } from './index';

export const IDLE_TIMER: TimerState = {
  running: false,
  startedAt: null,
  elapsedMs: 0,
  targetMs: null,
};

/** now 는 데스크톱 시계 기준이어야 한다. 폰에서는 Date.now() + clockOffset 을 넘긴다. */
export function timerElapsed(t: TimerState, now: number): number {
  return t.elapsedMs + (t.running && t.startedAt !== null ? Math.max(0, now - t.startedAt) : 0);
}

export function timerStart(t: TimerState, now: number): TimerState {
  if (t.running) return t;
  return { ...t, running: true, startedAt: now };
}

export function timerPause(t: TimerState, now: number): TimerState {
  if (!t.running) return t;
  return { ...t, running: false, startedAt: null, elapsedMs: timerElapsed(t, now) };
}

export function timerReset(t: TimerState): TimerState {
  return { ...IDLE_TIMER, targetMs: t.targetMs };
}

/** 목표 시간이 있으면 남은 시간(음수면 초과), 없으면 null */
export function timerRemaining(t: TimerState, now: number): number | null {
  return t.targetMs === null ? null : t.targetMs - timerElapsed(t, now);
}

/** 남은 시간이 이 값을 지나는 순간 폰을 진동시킨다 */
export const TIMER_ALERTS_MS = [5 * 60_000, 60_000, 0] as const;

/** prev -> next 사이에 지나간 알림 지점들 (남은 시간 기준) */
export function crossedAlerts(prevRemaining: number, nextRemaining: number): number[] {
  return TIMER_ALERTS_MS.filter((a) => prevRemaining > a && nextRemaining <= a);
}

/** 1:05, 12:30, 1:02:03. 음수면 앞에 - (목표 초과) */
export function formatClock(ms: number): string {
  const neg = ms < 0;
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  const body = h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  return neg ? `-${body}` : body;
}
