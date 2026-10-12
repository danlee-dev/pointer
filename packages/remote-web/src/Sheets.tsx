// 아래에서 올라오는 시트들: 장 이동, 타이머, 더보기.
// 모양은 모두 같다 - 제목, 한 줄 설명, 오른쪽 위 닫기.

import type { ReactNode } from 'react';
import { formatClock, timerElapsed, type Blank, type TimerState } from '@pointer/protocol';
import type { Messages } from '@pointer/i18n';
import { CheckIcon, CloseIcon } from './icons';

export function Sheet({ title, sub, onClose, children, t }: { title: string; sub?: string; onClose: () => void; children: ReactNode; t: Messages }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <h2>{title}</h2>
            {sub && <p className="muted small">{sub}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            <CloseIcon />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}

export function JumpSheet(props: {
  count: number;
  index: number;
  thumb: (i: number) => string | null;
  onPick: (i: number) => void;
  onClose: () => void;
  t: Messages;
}) {
  const { count, index, thumb, onPick, onClose, t } = props;
  return (
    <Sheet title={t.remote.jumpTitle} onClose={onClose} t={t}>
      <div className="jump-grid">
        {Array.from({ length: count }, (_, i) => {
          const src = thumb(i);
          return (
            <button key={i} className={i === index ? 'jump-item current' : 'jump-item'} onClick={() => onPick(i)}>
              {src ? <img src={src} alt="" loading="lazy" draggable={false} /> : <span className="jump-empty" />}
              <span className="num">{i + 1}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

const TARGETS = [5, 10, 15, 20, 30, 45, 60, 90];

export function TimerSheet(props: {
  timer: TimerState;
  now: number;
  onAction: (a: 'start' | 'pause' | 'reset') => void;
  onTarget: (ms: number | null) => void;
  onClose: () => void;
  t: Messages;
}) {
  const { timer, now, onAction, onTarget, onClose, t } = props;
  const elapsed = timerElapsed(timer, now);
  const targetMin = timer.targetMs === null ? null : timer.targetMs / 60_000;
  return (
    <Sheet title={t.timer.title} sub={t.timer.sub} onClose={onClose} t={t}>
      <p className={timer.running ? 'sheet-clock num' : 'sheet-clock num paused'}>{formatClock(elapsed)}</p>
      <div className="sheet-actions">
        <button className="btn primary" onClick={() => onAction(timer.running ? 'pause' : 'start')}>
          {timer.running ? t.timer.pause : elapsed > 0 ? t.timer.resume : t.timer.start}
        </button>
        <button className="btn" disabled={elapsed === 0} onClick={() => onAction('reset')}>
          {t.timer.reset}
        </button>
      </div>
      <h3 className="sheet-label">{t.timer.target}</h3>
      <ul className="choice-list">
        {[null, ...TARGETS].map((m) => (
          <li key={m ?? 'none'}>
            <button className="choice" onClick={() => onTarget(m === null ? null : m * 60_000)}>
              <span>{m === null ? t.timer.noTarget : t.timer.minutes(m)}</span>
              {targetMin === m && <CheckIcon />}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function MoreSheet(props: {
  blank: Blank;
  onBlank: (b: Blank) => void;
  hapticsOn: boolean;
  hapticsSupported: boolean;
  onHaptics: (on: boolean) => void;
  latency: number | null;
  onClose: () => void;
  t: Messages;
}) {
  const { blank, onBlank, hapticsOn, hapticsSupported, onHaptics, latency, onClose, t } = props;
  // 안드로이드 Chrome 은 전체 화면이면 주소창·아래 막대가 사라져 버튼이 더 커진다
  const canFullscreen = typeof document.documentElement.requestFullscreen === 'function';
  const isFullscreen = !!document.fullscreenElement;
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
    onClose();
  };
  return (
    <Sheet title={t.remote.more} onClose={onClose} t={t}>
      <ul className="choice-list">
        {blank !== 'black' && (
          <li>
            <button className="choice" onClick={() => onBlank('black')}>
              {t.remote.blankBlack}
            </button>
          </li>
        )}
        {blank !== 'white' && (
          <li>
            <button className="choice" onClick={() => onBlank('white')}>
              {t.remote.blankWhite}
            </button>
          </li>
        )}
        {blank !== 'none' && (
          <li>
            <button className="choice strong" onClick={() => onBlank('none')}>
              {t.remote.unblank}
            </button>
          </li>
        )}
        {canFullscreen && (
          <li>
            <button className="choice" onClick={toggleFullscreen}>
              {isFullscreen ? t.remote.exitFullscreen : t.remote.fullscreen}
            </button>
          </li>
        )}
        {hapticsSupported && (
          <li>
            <button className="choice" onClick={() => onHaptics(!hapticsOn)} role="switch" aria-checked={hapticsOn}>
              <span>{t.remote.vibration}</span>
              <span className="muted">{hapticsOn ? t.remote.on : t.remote.off}</span>
            </button>
          </li>
        )}
      </ul>
      {latency !== null && <p className="subtle small latency num">{t.remote.ms(latency)}</p>}
    </Sheet>
  );
}
