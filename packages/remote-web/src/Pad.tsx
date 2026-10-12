// 현재 장 썸네일 = 터치 패드. 누른 자리가 청중 화면의 같은 자리로 간다.
// 레이저·스포트라이트·돋보기는 좌표만 보내고, 펜은 획을 조금씩 끊어서 보낸다.
// 좌표는 손가락이 움직일 때마다가 아니라 화면 프레임(약 60Hz)마다 최신 것 하나만 보낸다.

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Blank, PenColor, Tool } from '@pointer/protocol';
import type { Messages } from '@pointer/i18n';
import type { RemoteClient } from '@pointer/remote-core';

const PEN_HEX: Record<PenColor, string> = { red: '#ff3b30', yellow: '#ffd60a', blue: '#2f8bff', white: '#ffffff' };
const MAX_CHUNK = 256; // x,y 128쌍

interface Props {
  client: RemoteClient;
  src: string | null;
  aspect: number;
  index: number;
  blank: Blank;
  tool: Tool;
  penColor: PenColor;
  /** 지우기 버튼을 누를 때마다 바뀌는 값 */
  clearSignal: number;
  showHint: boolean;
  onUsed: () => void;
  t: Messages;
}

function randomId() {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function Pad({ client, src, aspect, index, blank, tool, penColor, clearSignal, showHint, onUsed, t }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState<string | null>(src);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);

  // 새 썸네일이 다 받아질 때까지 이전 그림을 둔다 (빈 화면이 깜빡이지 않게)
  useEffect(() => {
    if (!src) return;
    const im = new Image();
    im.onload = () => setShown(src);
    im.src = src;
  }, [src]);

  // ---------- 폰에서 그린 획 미리보기 ----------
  const strokes = useRef<{ color: PenColor; pts: number[] }[]>([]);
  const redraw = () => {
    const c = inkRef.current;
    const pad = padRef.current;
    if (!c || !pad) return;
    const r = pad.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, r.width * 0.0042);
    for (const s of strokes.current) {
      ctx.strokeStyle = PEN_HEX[s.color];
      ctx.beginPath();
      for (let i = 0; i < s.pts.length; i += 2) {
        const x = s.pts[i]! * r.width;
        const y = s.pts[i + 1]! * r.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (s.pts.length === 2) ctx.lineTo(s.pts[0]! * r.width + 0.1, s.pts[1]! * r.height);
      ctx.stroke();
    }
  };
  useEffect(() => {
    strokes.current = [];
    redraw();
  }, [index, clearSignal]);
  useEffect(() => {
    const ro = new ResizeObserver(redraw);
    if (padRef.current) ro.observe(padRef.current);
    return () => ro.disconnect();
  }, []);

  // ---------- 보내기 ----------
  const active = useRef<{ id: number; tool: Tool } | null>(null);
  const latest = useRef<{ x: number; y: number } | null>(null);
  const penPending = useRef<number[]>([]);
  const penStroke = useRef<{ id: string; color: PenColor; pts: number[] } | null>(null);
  const raf = useRef(0);

  const flush = (end = false) => {
    raf.current = 0;
    const a = active.current;
    if (penStroke.current) {
      const s = penStroke.current;
      let pending = penPending.current;
      penPending.current = [];
      while (pending.length > MAX_CHUNK) {
        client.send({ t: 'stroke', id: s.id, color: s.color, pts: pending.slice(0, MAX_CHUNK), end: false });
        pending = pending.slice(MAX_CHUNK);
      }
      if (pending.length || end) client.send({ t: 'stroke', id: s.id, color: s.color, pts: pending, end });
      return;
    }
    if (a && a.tool !== 'pen' && latest.current) {
      client.send({ t: 'pointer', tool: a.tool, on: true, ...latest.current });
    }
  };
  const schedule = () => {
    if (!raf.current) raf.current = requestAnimationFrame(() => flush());
  };

  const pos = (e: RPointerEvent) => {
    const r = padRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const onDown = (e: RPointerEvent) => {
    if (active.current || blank !== 'none') return;
    e.preventDefault();
    padRef.current!.setPointerCapture(e.pointerId);
    active.current = { id: e.pointerId, tool };
    onUsed();
    const p = pos(e);
    setFinger(p);
    if (tool === 'pen') {
      const s = { id: randomId(), color: penColor, pts: [p.x, p.y] };
      penStroke.current = s;
      strokes.current.push({ color: s.color, pts: s.pts });
      penPending.current = [p.x, p.y];
      redraw();
    } else {
      latest.current = p;
    }
    schedule();
  };

  const onMove = (e: RPointerEvent) => {
    if (active.current?.id !== e.pointerId) return;
    const p = pos(e);
    setFinger(p);
    if (penStroke.current) {
      penStroke.current.pts.push(p.x, p.y);
      penPending.current.push(p.x, p.y);
      redraw();
    } else {
      latest.current = p;
    }
    schedule();
  };

  const onUp = (e: RPointerEvent) => {
    const a = active.current;
    if (a?.id !== e.pointerId) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    if (penStroke.current) {
      flush(true);
      penStroke.current = null;
    } else if (a.tool !== 'pen') {
      client.send({ t: 'pointer', tool: a.tool, on: false, ...(latest.current ?? { x: 0, y: 0 }) });
    }
    active.current = null;
    latest.current = null;
    setFinger(null);
  };

  return (
    <div className="pad-wrap">
      <div
        ref={padRef}
        className={finger ? 'pad pressing' : 'pad'}
        style={{ ['--ar' as string]: String(aspect) }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {shown && <img src={shown} alt="" draggable={false} />}
        <canvas ref={inkRef} className="pad-ink" />
        {finger && tool !== 'pen' && (
          <span className={`finger finger-${tool}`} style={{ left: `${finger.x * 100}%`, top: `${finger.y * 100}%` }} />
        )}
        {showHint && blank === 'none' && <p className="pad-hint">{t.toolHint[tool]}</p>}
        {blank !== 'none' && (
          <div className="pad-blank">
            <p>{t.remote.blanked[blank]}</p>
            <p className="muted small">{t.remote.unblankHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}
