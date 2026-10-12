// 청중 화면. 슬라이드와 효과 말고는 아무것도 보이지 않는다.

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Stage } from './stage/Stage';
import { useLoadedDeck, usePresentationKeys, usePresentationState } from './hooks';
import './audience.css';

function Audience() {
  const state = usePresentationState();
  const deck = useLoadedDeck(state?.deck ?? null);
  const [idle, setIdle] = useState(false);

  usePresentationKeys({
    total: state?.deck?.pages.length ?? 0,
    blank: state?.blank ?? 'none',
    onEscape: () => window.pointer.stopPresenting(),
  });

  // 마우스를 1.5초 안 움직이면 커서를 숨긴다
  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), 1500);
    const onMove = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), 1500);
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  if (!state?.deck) return <main className="audience" />;
  return (
    <main className={idle ? 'audience idle' : 'audience'}>
      <Stage className="audience-stage" deck={deck} pages={state.deck.pages} index={state.index} fx preload />
      <div className={`blank blank-${state.blank}`} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Audience />);
