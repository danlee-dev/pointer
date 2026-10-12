// 장 하나를 주어진 칸에 비율 맞춰 그리는 컴포넌트.
// fx 를 켜면 레이저·스포트라이트·돋보기·판서를 위에 겹쳐 그린다 (청중 화면, 발표자 화면 현재 장).
// pointerInput 을 켜면 마우스로 슬라이드를 누른 채 움직여 레이저를 쏠 수 있다.

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { PageSize } from '@pointer/protocol';
import { quantize, type LoadedDeck } from '../deck/loadDeck';
import { FxEngine } from './fx';

interface Props {
  deck: LoadedDeck | null;
  pages: PageSize[];
  index: number;
  fx?: boolean;
  pointerInput?: boolean;
  /** 앞뒤 장을 미리 그려 둘지 (청중 화면) */
  preload?: boolean;
  className?: string;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function fit(box: { w: number; h: number }, page: PageSize | undefined): Rect {
  if (!page || box.w === 0 || box.h === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const s = Math.min(box.w / page.w, box.h / page.h);
  const w = Math.floor(page.w * s);
  const h = Math.floor(page.h * s);
  return { x: Math.floor((box.w - w) / 2), y: Math.floor((box.h - h) / 2), w, h };
}

export function Stage({ deck, pages, index, fx = false, pointerInput = false, preload = false, className }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<FxEngine | null>(null);
  const slideBitmap = useRef<ImageBitmap | null>(null);
  const hiRes = useRef<{ index: number; bmp: ImageBitmap } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [dpr, setDpr] = useState(window.devicePixelRatio || 1);

  const rect = fit(box, pages[index]);

  useLayoutEffect(() => {
    const el = boxRef.current!;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry!.contentRect;
      setBox({ w: Math.floor(r.width), h: Math.floor(r.height) });
      setDpr(window.devicePixelRatio || 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---------- 슬라이드 ----------
  useEffect(() => {
    const canvas = slideRef.current;
    if (!deck || !canvas || rect.w === 0) return;
    let alive = true;
    const width = quantize(rect.w * dpr);
    void deck.bitmap(index, width).then(
      (bmp) => {
        if (!alive) return;
        canvas.width = Math.round(rect.w * dpr);
        canvas.height = Math.round(rect.h * dpr);
        const ctx = canvas.getContext('2d', { alpha: false })!;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        slideBitmap.current = bmp;
      },
      () => {},
    );
    if (preload) {
      for (const n of [index + 1, index - 1, index + 2]) {
        if (n >= 0 && n < pages.length) void deck.bitmap(n, width).catch(() => {});
      }
    }
    return () => {
      alive = false;
    };
  }, [deck, index, rect.w, rect.h, dpr, preload, pages.length]);

  // ---------- 효과 ----------
  useEffect(() => {
    if (!fx) return;
    const e = new FxEngine(fxRef.current!, inkRef.current!);
    engine.current = e;
    e.magnifySource = () => (hiRes.current?.index === indexRef.current ? hiRes.current.bmp : slideBitmap.current);
    void window.pointer.getInk().then((list) => e.inkSet(list));
    const offPointer = window.pointer.onPointer((p) => {
      e.pointer(p);
      if (p.on && p.tool === 'magnify') requestHiRes();
    });
    const offInk = window.pointer.onInk((ev) => (ev.type === 'clear' ? e.inkClear() : e.inkAppend(ev.id, ev.color, ev.pts)));
    return () => {
      offPointer();
      offInk();
      e.destroy();
      engine.current = null;
    };
  }, [fx]);

  // 효과 리스너는 한 번만 붙이므로 최신 값은 ref 로 읽는다
  const indexRef = useRef(index);
  indexRef.current = index;
  const rectRef = useRef(rect);
  rectRef.current = rect;
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const dprRef = useRef(dpr);
  dprRef.current = dpr;

  /** 돋보기용으로 현재 장을 2.4배 크기로 한 번 더 그려 둔다 */
  function requestHiRes() {
    const i = indexRef.current;
    const d = deckRef.current;
    if (!d || hiRes.current?.index === i) return;
    const width = quantize(rectRef.current.w * dprRef.current * 2.4);
    void d.bitmap(i, width).then(
      (bmp) => {
        if (indexRef.current === i) hiRes.current = { index: i, bmp };
      },
      () => {},
    );
  }

  useEffect(() => {
    engine.current?.resize(rect.w, rect.h, dpr);
  }, [rect.w, rect.h, dpr]);

  // ---------- 마우스 레이저 ----------
  const pressing = useRef(false);
  function pos(e: ReactPointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }
  const onDown = (e: ReactPointerEvent) => {
    if (!pointerInput || e.button !== 0) return;
    pressing.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    window.pointer.command({ t: 'pointer', tool: 'laser', on: true, ...pos(e) });
  };
  const onMove = (e: ReactPointerEvent) => {
    if (pressing.current) window.pointer.command({ t: 'pointer', tool: 'laser', on: true, ...pos(e) });
  };
  const onUp = (e: ReactPointerEvent) => {
    if (!pressing.current) return;
    pressing.current = false;
    window.pointer.command({ t: 'pointer', tool: 'laser', on: false, ...pos(e) });
  };

  const layer = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const;
  return (
    // 위치(position)는 className 쪽 CSS 가 정한다. 여기서 relative 를 박으면 .fill 의 absolute 를 덮어써서 높이가 0 이 된다.
    <div ref={boxRef} className={className} style={{ overflow: 'hidden' }}>
      <div
        style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <canvas ref={slideRef} style={layer} />
        {fx && <canvas ref={inkRef} style={{ ...layer, pointerEvents: 'none' }} />}
        {fx && <canvas ref={fxRef} style={{ ...layer, pointerEvents: 'none' }} />}
      </div>
    </div>
  );
}
