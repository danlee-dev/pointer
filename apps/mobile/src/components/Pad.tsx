// 현재 장 썸네일 = 터치 패드 (웹 리모컨 Pad.tsx 와 같은 동작).
// 레이저·스포트라이트·돋보기는 좌표를, 펜은 획을 보낸다. 좌표는 화면 프레임마다 최신 것 하나만.
// '에어' 는 누른 채 폰을 기울이면 자이로로 레이저를 움직인다.

import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Blank, PenColor, Tool } from '@pointer/protocol';
import type { RemoteClient } from '@pointer/remote-core';
import { useAirPointer } from '../hooks/useAirPointer';
import { t } from '../i18n';
import { color, curve, pen, radius } from '../theme';

export type PadTool = Tool | 'air';
const MAX_CHUNK = 256;

interface Props {
  client: RemoteClient;
  src: string | null;
  aspect: number;
  index: number;
  blank: Blank;
  tool: PadTool;
  penColor: PenColor;
  clearSignal: number;
  showHint: boolean;
  onUsed: () => void;
  maxHeight: number;
}

const randomId = () => Math.random().toString(16).slice(2, 14);

export function Pad({ client, src, aspect, index, blank, tool, penColor, clearSignal, showHint, onUsed, maxHeight }: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [shown, setShown] = useState<string | null>(src);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  const [strokes, setStrokes] = useState<{ color: PenColor; pts: number[] }[]>([]);

  // 새 썸네일을 미리 받아 두고 바꾼다 (빈 화면이 깜빡이지 않게)
  useEffect(() => {
    if (!src) return;
    let alive = true;
    Image.prefetch(src).then(
      () => alive && setShown(src),
      () => alive && setShown(src),
    );
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => setStrokes([]), [index, clearSignal]);

  // ---------- 보내기 (프레임마다 최신 좌표 하나) ----------
  const activeTool = useRef<PadTool | null>(null);
  const latest = useRef<{ x: number; y: number } | null>(null);
  const penStroke = useRef<{ id: string; color: PenColor; pending: number[] } | null>(null);
  const raf = useRef<number | null>(null);

  const flush = (end = false) => {
    raf.current = null;
    const s = penStroke.current;
    if (s) {
      let pending = s.pending;
      s.pending = [];
      while (pending.length > MAX_CHUNK) {
        client.send({ t: 'stroke', id: s.id, color: s.color, pts: pending.slice(0, MAX_CHUNK), end: false });
        pending = pending.slice(MAX_CHUNK);
      }
      if (pending.length || end) client.send({ t: 'stroke', id: s.id, color: s.color, pts: pending, end });
      return;
    }
    const tl = activeTool.current;
    if (tl && tl !== 'pen' && latest.current) {
      client.send({ t: 'pointer', tool: tl === 'air' ? 'laser' : tl, on: true, ...latest.current });
    }
  };
  const schedule = () => {
    if (raf.current === null) raf.current = requestAnimationFrame(() => flush());
  };

  const air = useAirPointer((x, y) => {
    latest.current = { x, y };
    setFinger({ x, y });
    schedule();
  });

  const pos = (e: GestureResponderEvent) => ({
    x: Math.min(1, Math.max(0, e.nativeEvent.locationX / (box.w || 1))),
    y: Math.min(1, Math.max(0, e.nativeEvent.locationY / (box.h || 1))),
  });

  const onGrant = (e: GestureResponderEvent) => {
    if (blank !== 'none') return;
    onUsed();
    const p = pos(e);
    activeTool.current = tool;
    setFinger(p);
    if (tool === 'pen') {
      const id = randomId();
      penStroke.current = { id, color: penColor, pending: [p.x, p.y] };
      setStrokes((list) => [...list, { color: penColor, pts: [p.x, p.y] }]);
    } else {
      latest.current = p;
      if (tool === 'air') air.start(p.x, p.y, aspect);
    }
    schedule();
  };

  const onMove = (e: GestureResponderEvent) => {
    const tl = activeTool.current;
    if (!tl || tl === 'air') return; // 에어는 손가락이 아니라 폰 움직임으로 간다
    const p = pos(e);
    setFinger(p);
    if (tl === 'pen' && penStroke.current) {
      penStroke.current.pending.push(p.x, p.y);
      setStrokes((list) => {
        const copy = list.slice();
        const lastStroke = copy[copy.length - 1];
        if (lastStroke) copy[copy.length - 1] = { ...lastStroke, pts: [...lastStroke.pts, p.x, p.y] };
        return copy;
      });
    } else {
      latest.current = p;
    }
    schedule();
  };

  const onRelease = () => {
    const tl = activeTool.current;
    if (!tl) return;
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (tl === 'pen') {
      flush(true);
      penStroke.current = null;
    } else {
      if (tl === 'air') air.stop();
      client.send({ t: 'pointer', tool: tl === 'air' ? 'laser' : tl, on: false, ...(latest.current ?? { x: 0, y: 0 }) });
    }
    activeTool.current = null;
    latest.current = null;
    setFinger(null);
  };

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const toPath = (pts: number[]) => {
    let d = '';
    for (let i = 0; i < pts.length; i += 2) d += `${i === 0 ? 'M' : 'L'}${(pts[i]! * box.w).toFixed(1)},${(pts[i + 1]! * box.h).toFixed(1)}`;
    return pts.length === 2 ? `${d}l0.1,0` : d;
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.pad, { aspectRatio: aspect, maxHeight, maxWidth: maxHeight * aspect }]}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={onGrant}
        onResponderMove={onMove}
        onResponderRelease={onRelease}
        onResponderTerminate={onRelease}
      >
        {shown && <Image source={{ uri: shown }} style={[StyleSheet.absoluteFill, finger ? { opacity: 0.85 } : null]} resizeMode="contain" />}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {strokes.map((s, i) => (
            <Path key={i} d={toPath(s.pts)} stroke={pen[s.color]} strokeWidth={Math.max(2, box.w * 0.0042)} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
        {finger && tool !== 'pen' && (
          <View pointerEvents="none" style={[styles.finger, tool === 'spotlight' ? styles.fingerSpot : tool === 'magnify' ? styles.fingerLens : styles.fingerLaser, { left: finger.x * box.w, top: finger.y * box.h }]} />
        )}
        {showHint && blank === 'none' && (
          <View pointerEvents="none" style={styles.hint}>
            <Text style={styles.hintText}>{t.toolHint[tool]}</Text>
          </View>
        )}
        {blank !== 'none' && (
          <View style={styles.blank}>
            <Text style={styles.blankTitle}>{t.remote.blanked[blank]}</Text>
            <Text style={styles.blankSub}>{t.remote.unblankHint}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pad: { width: '100%', borderRadius: radius.lg, ...curve, overflow: 'hidden', backgroundColor: color.bgRaised },
  finger: { position: 'absolute', borderRadius: 999 },
  fingerLaser: { width: 22, height: 22, marginLeft: -11, marginTop: -11, backgroundColor: color.laser, shadowColor: color.laser, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  fingerSpot: { width: 64, height: 64, marginLeft: -32, marginTop: -32, borderWidth: 2, borderColor: '#fff' },
  fingerLens: { width: 56, height: 56, marginLeft: -28, marginTop: -28, borderWidth: 3, borderColor: '#fff' },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 20, paddingBottom: 10, paddingHorizontal: 12, backgroundColor: 'rgba(12,10,9,0.6)' },
  hintText: { color: '#fff', fontSize: 13, textAlign: 'center' },
  blank: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 4, backgroundColor: 'rgba(12,10,9,0.86)' },
  blankTitle: { color: color.fg, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  blankSub: { color: color.fgMuted, fontSize: 13, textAlign: 'center' },
});
