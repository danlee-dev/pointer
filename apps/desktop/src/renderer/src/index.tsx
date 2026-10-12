// main 창: 자료가 없으면 홈, 있으면 발표자 화면.

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type { OpenResult } from '../../shared/ipc';
import { Home } from './components/Home';
import { PasswordSheet } from './components/PasswordSheet';
import { Presenter } from './components/Presenter';
import { useConnection, useMessages, usePresentationState } from './hooks';
import wordmark from './components/wordmark.svg?raw';
import './app.css';

function App() {
  const state = usePresentationState();
  const conn = useConnection();
  const { t, locale } = useMessages();
  const [password, setPassword] = useState<{ title: string; wrong: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const hasDeck = !!state?.deck;

  useEffect(() => window.pointer.onPasswordRequest(setPassword), []);
  useEffect(() => window.pointer.onNotice((n) => n === 'mirrorOff' && setToast(t.presenter.mirrorOff)), [t]);

  // 홈은 시스템 라이트/다크를 따르고, 발표자 화면은 어두운 테마로 고정한다 (DESIGN.md)
  useEffect(() => {
    if (hasDeck) delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = 'system';
  }, [hasDeck]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const onResult = (r: OpenResult) => {
    if (r.ok || r.reason === 'canceled') return;
    setToast(r.reason === 'open' ? t.error.open : t.error[r.reason]);
  };

  // 창 어디에 떨어뜨려도 연다 (발표 중이면 자료를 바꾼다)
  const dropHandlers = {
    onDragEnter: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const files = [...e.dataTransfer.files];
      if (files.length) void window.pointer.openFiles(files).then(onResult);
    },
  };

  if (!state) return null;
  return (
    <div className="app" data-platform={window.pointer.platform} {...dropHandlers}>
      {state.deck ? (
        <Presenter state={{ ...state, deck: state.deck }} conn={conn} t={t} />
      ) : (
        <>
          <header className="titlebar">
            <span className="brand" dangerouslySetInnerHTML={{ __html: wordmark }} />
          </header>
          <Home t={t} locale={locale} conn={conn} dragging={dragging} onResult={onResult} />
        </>
      )}
      {password && <PasswordSheet title={password.title} wrong={password.wrong} t={t} />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
