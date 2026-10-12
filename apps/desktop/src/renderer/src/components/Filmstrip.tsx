// 발표자 화면 아래 장 목록. 누르면 그 장으로 간다.

import { useEffect, useRef } from 'react';
import { useThumb } from '../hooks';

function Thumb({ deckId, index, current }: { deckId: string; index: number; current: boolean }) {
  const url = useThumb(deckId, index);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (current) ref.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [current]);
  return (
    <button
      ref={ref}
      // 'current' 는 발표자 보기의 큰 슬라이드 칸 클래스와 겹친다. is-current 로 구분
      className={current ? 'thumb is-current' : 'thumb'}
      onClick={() => window.pointer.command({ t: 'goto', index })}
      aria-current={current ? 'page' : undefined}
    >
      {url ? <img src={url} alt="" draggable={false} /> : <span className="thumb-empty" />}
      <span className="thumb-num num">{index + 1}</span>
    </button>
  );
}

export function Filmstrip({ deckId, count, index }: { deckId: string; count: number; index: number }) {
  return (
    <nav className="strip">
      {Array.from({ length: count }, (_, i) => (
        <Thumb key={i} deckId={deckId} index={i} current={i === index} />
      ))}
    </nav>
  );
}
