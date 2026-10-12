// 발표자 화면: 현재 장(레이저·판서가 같이 보임), 다음 장, 타이머, 메모, 장 목록.
// 모니터가 둘이면 노트북에 이 화면, 프로젝터에 청중 화면이 뜬다.

import { useState } from 'react';
import type { PresentationState } from '@pointer/protocol';
import type { Messages } from '@pointer/i18n';
import type { ConnectionInfo } from '../../../shared/ipc';
import { Stage } from '../stage/Stage';
import { CueLayer } from '../cues/CueLayer';
import { useDisplayCount, useFullscreen, useLoadedDeck, usePresentationKeys } from '../hooks';
import { ConnectPanel } from './ConnectPanel';
import { CloseIcon, ExpandIcon, ShrinkIcon } from './icons';
import { Filmstrip } from './Filmstrip';
import { Notes } from './Notes';
import { TimerPanel } from './TimerPanel';

interface Props {
  state: PresentationState & { deck: NonNullable<PresentationState['deck']> };
  conn: ConnectionInfo | null;
  t: Messages;
}

export function Presenter({ state, conn, t }: Props) {
  const deck = useLoadedDeck(state.deck);
  const [showConnect, setShowConnect] = useState(false);
  const api = window.pointer;
  const { pages } = state.deck;
  const last = state.index >= pages.length - 1;
  const devices = conn?.devices.length ?? 0;
  const displays = useDisplayCount();
  const fullscreen = useFullscreen();

  usePresentationKeys({
    total: pages.length,
    blank: state.blank,
    onEscape: state.presenting ? () => api.stopPresenting() : undefined,
    onFullscreen: () => api.toggleFullscreen(),
  });

  const status = state.presenting
    ? state.blank !== 'none'
      ? t.presenter.blanked[state.blank]
      : t.presenter.presenting
    : null;

  return (
    <div className={fullscreen ? 'presenter fullscreen' : 'presenter'}>
      <header className="titlebar">
        <div className="title-group">
          <span className="deck-title">{state.deck.title}</span>
          <span className="page num">
            {state.index + 1} / {pages.length}
          </span>
          {status && <span className={state.blank !== 'none' ? 'status circle alert' : 'status circle live'}>{status}</span>}
        </div>
        <div className="title-actions">
          <button className="btn with-icon" onClick={() => api.toggleFullscreen()} title="F">
            {fullscreen ? <ShrinkIcon /> : <ExpandIcon />}
            {fullscreen ? t.presenter.exitFullscreen : t.presenter.fullscreen}
          </button>
          <button className="btn" onClick={() => setShowConnect(true)}>
            {devices > 0 ? t.connect.devices(devices) : t.connect.title}
          </button>
          {state.presenting && displays > 1 && (
            <button className="btn" onClick={() => api.swapDisplays()}>
              {t.presenter.swap}
            </button>
          )}
          {state.presenting ? (
            <button className="btn" onClick={() => api.stopPresenting()}>
              {t.presenter.stop}
            </button>
          ) : (
            <button className="btn primary" onClick={() => api.startPresenting()}>
              {t.presenter.start}
            </button>
          )}
          <button className="btn-text" onClick={() => api.closeDeck()}>
            {t.presenter.closeDeck}
          </button>
        </div>
      </header>

      <main className="presenter-main">
        <section className="current">
          <Stage className="fill" deck={deck} pages={pages} index={state.index} fx pointerInput preload />
          <CueLayer />
          {state.blank !== 'none' && <div className={`current-blank blank-${state.blank}`} />}
        </section>

        <aside className="side">
          <div className="next">
            <p className="caption">{last ? t.presenter.endOfDeck : t.presenter.nextSlide}</p>
            {!last && <Stage className="next-stage" deck={deck} pages={pages} index={state.index + 1} />}
          </div>
          <TimerPanel timer={state.timer} t={t} />
          <Notes deckId={state.deck.id} index={state.index} initial={state.notes} t={t} />
        </aside>
      </main>

      <footer className="presenter-foot">
        <Filmstrip deckId={state.deck.id} count={pages.length} index={state.index} />
        <p className="keys subtle small">{t.presenter.keys}</p>
        <p className="keys subtle small">{t.presenter.cueKeys}</p>
      </footer>

      {showConnect && (
        <div className="sheet-backdrop" onClick={() => setShowConnect(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="sheet-close icon-btn" onClick={() => setShowConnect(false)} aria-label={t.close}>
              <CloseIcon />
            </button>
            <ConnectPanel conn={conn} t={t} />
          </div>
        </div>
      )}
    </div>
  );
}
