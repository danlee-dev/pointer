// 안드로이드(그리고 아무 폰 브라우저)용 리모컨.
// 데스크톱 앱이 띄운 QR 주소 http://<컴퓨터>:<포트>/?k=<토큰> 으로 열린다.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import {
  crossedAlerts,
  formatClock,
  thumbUrl,
  timerRemaining,
  timerElapsed,
  TOOLS,
  PEN_COLORS,
  type Blank,
  type Pairing,
  type PenColor,
  type Tool,
} from '@pointer/protocol';
import { messages, resolveLocale, type Messages } from '@pointer/i18n';
import { RemoteClient } from '@pointer/remote-core';
import { deviceInfo, haptics, keepAwake } from './device';
import { LaserIcon, MagnifyIcon, MoreIcon, PenIcon, SpotlightIcon } from './icons';
import { Pad } from './Pad';
import { JumpSheet, MoreSheet, TimerSheet } from './Sheets';
import '@pointer/design/tokens.css';
import './remote.css';

const t: Messages = messages(resolveLocale(navigator.language));
document.documentElement.lang = resolveLocale(navigator.language);

const TOOL_ICON = { laser: LaserIcon, spotlight: SpotlightIcon, magnify: MagnifyIcon, pen: PenIcon };

function pairingFromLocation(): Pairing | null {
  const k = new URLSearchParams(location.search).get('k');
  if (!k) return null;
  return { host: location.hostname, port: Number(location.port || 80), token: k };
}

function store(key: string, value?: string) {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function Remote({ client, pairing }: { client: RemoteClient; pairing: Pairing }) {
  const snap = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const { state, status, latency, clockOffset } = snap;
  const [tool, setTool] = useState<Tool>(() => (TOOLS as string[]).includes(store('pointer.tool') ?? '') ? (store('pointer.tool') as Tool) : 'laser');
  const [penColor, setPenColor] = useState<PenColor>('red');
  const [clearSignal, setClearSignal] = useState(0);
  const [sheet, setSheet] = useState<'jump' | 'timer' | 'more' | null>(null);
  const [hintSeen, setHintSeen] = useState<Record<string, boolean>>({});
  const [hapticsOn, setHapticsOn] = useState(haptics.enabled);
  const now = useNow(250) + clockOffset;

  useEffect(() => {
    store('pointer.tool', tool);
  }, [tool]);

  // 화면을 껐다 켜면 바로 다시 붙는다
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && client.wake();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [client]);

  // 첫 터치에서 화면 꺼짐 방지를 켠다 (영상 재생은 사용자 동작이 있어야 된다)
  useEffect(() => {
    const once = () => void keepAwake();
    window.addEventListener('pointerdown', once, { once: true });
    return () => window.removeEventListener('pointerdown', once);
  }, []);

  // 목표 시간 알림: 5분, 1분 남았을 때, 끝났을 때 진동
  const prevRemaining = useRef<number | null>(null);
  const remaining = state ? timerRemaining(state.timer, now) : null;
  useEffect(() => {
    const prev = prevRemaining.current;
    prevRemaining.current = remaining;
    if (prev === null || remaining === null || !state?.timer.running) return;
    if (crossedAlerts(prev, remaining).length) haptics.alert();
  }, [remaining, state?.timer.running]);

  const thumb = useMemo(
    () => (i: number) => (state?.deck ? thumbUrl(pairing, state.deck.id, i) : null),
    [pairing, state?.deck?.id],
  );

  // 앞뒤 장 썸네일을 미리 받아 둔다
  useEffect(() => {
    if (!state?.deck) return;
    for (const i of [state.index + 1, state.index - 1, state.index + 2]) {
      if (i >= 0 && i < state.deck.pages.length) new Image().src = thumb(i)!;
    }
  }, [state?.deck?.id, state?.index, thumb]);

  if (status === 'expired' || status === 'revoked' || status === 'version') {
    const title = status === 'expired' ? t.remote.expired : status === 'revoked' ? t.remote.revoked : t.remote.versionMismatch;
    return (
      <main className="remote center">
        <div className="notice">
          <h1>{title}</h1>
          {status === 'expired' && <p className="muted">{t.remote.expiredSub}</p>}
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="remote center">
        <p className="muted">{t.remote.connecting}</p>
      </main>
    );
  }

  if (!state.deck) {
    return (
      <main className="remote center">
        <div className="notice">
          <h1>{t.remote.noDeck}</h1>
          {status !== 'open' && <p className="warn-text">{t.remote.reconnecting}</p>}
        </div>
      </main>
    );
  }

  const deck = state.deck;
  const page = deck.pages[state.index] ?? { w: 16, h: 9 };
  const nextPage = deck.pages[state.index + 1];
  const last = state.index >= deck.pages.length - 1;
  const blank = state.blank;

  const nav = (dir: 1 | -1) => {
    haptics.tick();
    // 가린 상태면 장은 그대로, 화면만 켜진다 (데스크톱과 같은 규칙)
    if (blank !== 'none') client.patchState({ blank: 'none' });
    else client.patchState({ index: Math.max(0, Math.min(deck.pages.length - 1, state.index + dir)) });
    client.send({ t: 'nav', dir });
  };
  const setBlank = (b: Blank) => {
    client.patchState({ blank: b });
    client.send({ t: 'blank', blank: b });
    setSheet(null);
  };

  const elapsed = timerElapsed(state.timer, now);
  const over = remaining !== null && remaining < 0;
  const clockText = remaining === null ? formatClock(elapsed) : formatClock(Math.abs(remaining));

  return (
    <main className="remote">
      <header className="bar">
        <button className="page-btn num" onClick={() => setSheet('jump')} aria-label={t.remote.jumpTitle}>
          <b>{state.index + 1}</b>
          <span>/ {deck.pages.length}</span>
        </button>
        <button
          className={over ? 'clock-btn num over' : state.timer.running ? 'clock-btn num' : 'clock-btn num paused'}
          onClick={() => setSheet('timer')}
          aria-label={t.timer.title}
        >
          {clockText}
          {remaining !== null && <span className="clock-suffix">{over ? t.timer.over : t.timer.left}</span>}
        </button>
        <button className="icon-btn" onClick={() => setSheet('more')} aria-label={t.remote.more}>
          <MoreIcon />
        </button>
      </header>

      {status !== 'open' && <p className="status-line warn-text">{t.remote.reconnecting}</p>}

      <Pad
        client={client}
        src={thumb(state.index)}
        aspect={page.w / page.h}
        index={state.index}
        blank={blank}
        tool={tool}
        penColor={penColor}
        clearSignal={clearSignal}
        showHint={!hintSeen[tool]}
        onUsed={() => !hintSeen[tool] && setHintSeen((h) => ({ ...h, [tool]: true }))}
        t={t}
      />

      <nav className="tools" aria-label="tools">
        {TOOLS.map((k) => {
          const Icon = TOOL_ICON[k];
          return (
            <button key={k} className={k === tool ? 'tool on' : 'tool'} onClick={() => setTool(k)} aria-pressed={k === tool}>
              <Icon />
              <span>{t.tool[k]}</span>
            </button>
          );
        })}
      </nav>

      {tool === 'pen' && (
        <div className="pen-row">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              className={c === penColor ? `swatch swatch-${c} on` : `swatch swatch-${c}`}
              onClick={() => setPenColor(c)}
              aria-label={c}
              aria-pressed={c === penColor}
            />
          ))}
          <button
            className="btn-text"
            onClick={() => {
              client.send({ t: 'clearInk' });
              setClearSignal((n) => n + 1);
            }}
          >
            {t.remote.clearInk}
          </button>
        </div>
      )}

      {state.notes && (
        <section className="notes" aria-label={t.remote.notes}>
          {state.notes}
        </section>
      )}

      <div className="nav">
        <button className="nav-prev" onClick={() => nav(-1)} disabled={state.index === 0 && blank === 'none'}>
          {t.remote.prev}
        </button>
        <button className={last ? 'nav-next last' : 'nav-next'} onClick={() => nav(1)} disabled={last && blank === 'none'}>
          {!last && nextPage && (
            <img src={thumb(state.index + 1) ?? undefined} alt="" draggable={false} style={{ aspectRatio: `${nextPage.w} / ${nextPage.h}` }} />
          )}
          <span>{last ? t.remote.last : t.remote.next}</span>
        </button>
      </div>

      {sheet === 'jump' && (
        <JumpSheet
          count={deck.pages.length}
          index={state.index}
          thumb={thumb}
          onPick={(i) => {
            haptics.tick();
            client.patchState({ index: i, blank: 'none' });
            client.send({ t: 'goto', index: i });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
          t={t}
        />
      )}
      {sheet === 'timer' && (
        <TimerSheet
          timer={state.timer}
          now={now}
          onAction={(action) => client.send({ t: 'timer', action })}
          onTarget={(ms) => client.send({ t: 'timerTarget', ms })}
          onClose={() => setSheet(null)}
          t={t}
        />
      )}
      {sheet === 'more' && (
        <MoreSheet
          blank={blank}
          onBlank={setBlank}
          hapticsOn={hapticsOn}
          hapticsSupported={haptics.supported}
          onHaptics={(on) => {
            haptics.enabled = on;
            setHapticsOn(on);
          }}
          latency={latency}
          onClose={() => setSheet(null)}
          t={t}
        />
      )}
    </main>
  );
}

function App() {
  const pairing = useMemo(pairingFromLocation, []);
  const client = useMemo(() => (pairing ? new RemoteClient(pairing, deviceInfo()) : null), [pairing]);
  useEffect(() => {
    client?.connect();
  }, [client]);

  if (!pairing || !client) {
    return (
      <main className="remote center">
        <div className="notice">
          <h1>{t.remote.expired}</h1>
          <p className="muted">{t.remote.expiredSub}</p>
        </div>
      </main>
    );
  }
  return <Remote client={client} pairing={pairing} />;
}

// 두 손가락 확대·더블탭 확대로 화면이 흔들리지 않게
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

createRoot(document.getElementById('root')!).render(<App />);
