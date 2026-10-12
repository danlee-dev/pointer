// 에어 포인터: 슬라이드를 누른 채 폰을 기울이면 레이저가 따라간다 (자이로).
// 폰 위쪽 끝으로 화면을 가리키듯 든다고 보고, 좌우로 돌리면(z 축) 가로, 위아래로 들면(x 축) 세로로 움직인다.
// 회전 속도(rad/s)에 시간을 곱해 위치를 쌓는다. 시작점은 손가락을 댄 자리.

import { useRef } from 'react';
import { Gyroscope } from 'expo-sensors';

/** 1 라디안(약 57도) 돌리면 화면 폭의 몇 배를 가나. 40도쯤 돌리면 화면 끝에서 끝 */
const GAIN_X = 1.4;
const GAIN_Y = 1.4;

export function useAirPointer(onMove: (x: number, y: number) => void) {
  const sub = useRef<{ remove(): void } | null>(null);
  const pos = useRef({ x: 0.5, y: 0.5 });
  const last = useRef<number | null>(null);
  const move = useRef(onMove);
  move.current = onMove;

  return {
    start(x: number, y: number, aspect: number) {
      pos.current = { x, y };
      last.current = null;
      Gyroscope.setUpdateInterval(16);
      sub.current?.remove();
      sub.current = Gyroscope.addListener((g) => {
        const now = g.timestamp;
        const dt = last.current === null ? 0 : Math.min(0.1, now - last.current);
        last.current = now;
        const p = pos.current;
        // 세로 이동은 화면 비율만큼 보정 (16:9 면 같은 각도에 세로가 더 많이 움직인다)
        p.x = Math.min(1, Math.max(0, p.x - g.z * dt * GAIN_X));
        p.y = Math.min(1, Math.max(0, p.y - g.x * dt * GAIN_Y * aspect));
        move.current(p.x, p.y);
      });
    },
    stop() {
      sub.current?.remove();
      sub.current = null;
      return pos.current;
    },
  };
}
