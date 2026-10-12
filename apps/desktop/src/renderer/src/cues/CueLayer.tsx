// 효과를 그리는 투명한 층. 부모 칸을 꽉 채운다 (청중 화면 전체, 발표자 화면의 현재 장).

import { useEffect, useRef } from 'react';
import { CueEngine } from './engine';

export function CueLayer() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const engine = new CueEngine(host.current!);
    const off = window.pointer.onCue((e) => engine.handle(e.cue, e.on, e.audio));
    return () => {
      off();
      engine.destroy();
    };
  }, []);
  return <div ref={host} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden />;
}
