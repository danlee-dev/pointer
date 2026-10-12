import { formatClock, timerElapsed, timerRemaining, type TimerState } from '@pointer/protocol';
import type { Messages } from '@pointer/i18n';
import { useNow } from '../hooks';

export const TARGET_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90];

/** 데스크톱이 상태를 보낸 시각과 이 창의 시계는 같은 컴퓨터라 보정이 필요 없다 */
export function TimerPanel({ timer, t }: { timer: TimerState; t: Messages }) {
  const now = useNow(250);
  const elapsed = timerElapsed(timer, now);
  const remaining = timerRemaining(timer, now);
  const over = remaining !== null && remaining < 0;
  const cmd = window.pointer.command;

  const main = remaining === null ? formatClock(elapsed) : formatClock(Math.abs(remaining));
  const suffix = remaining === null ? null : over ? t.timer.over : t.timer.left;

  return (
    <div className="timer">
      <div className={over ? 'clock num over' : timer.running ? 'clock num' : 'clock num paused'}>
        {main}
        {suffix && <span className="clock-suffix">{suffix}</span>}
      </div>
      {remaining !== null && <p className="muted small num">{formatClock(elapsed)}</p>}
      <div className="timer-actions">
        <button className="btn" onClick={() => cmd({ t: 'timer', action: timer.running ? 'pause' : 'start' })}>
          {timer.running ? t.timer.pause : elapsed > 0 ? t.timer.resume : t.timer.start}
        </button>
        <button className="btn" disabled={elapsed === 0} onClick={() => cmd({ t: 'timer', action: 'reset' })}>
          {t.timer.reset}
        </button>
        <select
          aria-label={t.timer.target}
          value={timer.targetMs === null ? '' : String(timer.targetMs / 60_000)}
          onChange={(e) => cmd({ t: 'timerTarget', ms: e.target.value ? Number(e.target.value) * 60_000 : null })}
        >
          <option value="">{t.timer.noTarget}</option>
          {TARGET_MINUTES.map((m) => (
            <option key={m} value={m}>
              {t.timer.target} {t.timer.minutes(m)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
