// 기기 이미지 위 화면 자리(네 모서리)에 HTML 화면을 원근에 맞춰 얹는다.
// 사각형 -> 사각형 투영 변환(호모그래피)을 구해 matrix3d 로 건다. 클릭·터치는 브라우저가 알아서 거꾸로 맞춰 주지만,
// 패드처럼 좌표가 필요한 곳은 getBoundingClientRect 가 기울어진 모양의 바깥 상자를 주므로 toLocal 로 되돌려 쓴다.

import type { Quad } from '../data/devices';

/** 3x3 행렬 [a b c; d e f; g h 1] 을 한 줄로 */
type Mat = [number, number, number, number, number, number, number, number, number];

/** (0,0) (w,0) (w,h) (0,h) 를 네 점으로 보내는 변환 (Heckbert 의 정사각형 -> 사각형) */
function rectToQuad(w: number, h: number, p: [number, number][]): Mat {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p as [[number, number], [number, number], [number, number], [number, number]];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let a, b, d, e, g, hh;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    a = x1 - x0; b = x3 - x0; d = y1 - y0; e = y3 - y0; g = 0; hh = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    hh = (dx1 * dy3 - dx3 * dy1) / den;
    a = x1 - x0 + g * x1;
    b = x3 - x0 + hh * x3;
    d = y1 - y0 + g * y1;
    e = y3 - y0 + hh * y3;
  }
  // 단위 정사각형 기준을 w x h 기준으로
  return [a / w, b / h, x0, d / w, e / h, y0, g / w, hh / h, 1];
}

function invert(m: Mat): Mat {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

function apply(m: Mat, x: number, y: number): [number, number] {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

const css = (m: Mat) => `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,${m[8]})`;

export interface Warp {
  /** 화면 밖 좌표(client) -> 얹은 화면 안 좌표(CSS px, 변환 전 기준) */
  toLocal(clientX: number, clientY: number): { x: number; y: number };
}

const warps = new WeakMap<HTMLElement, Warp>();

/** 기기 이미지가 다 그려진 뒤에 기기·화면을 같이 보인다 (화면만 먼저 떠 있지 않게). CSS 의 .device.ready */
function revealWhenDecoded(frame: HTMLElement) {
  const img = frame.querySelector<HTMLImageElement>('.device-img');
  const show = () => frame.classList.add('ready');
  if (!img) return show();
  img.decode().then(show, show);
}

/** frame(기기 이미지 칸) 안의 el 을 quad 자리에 맞춘다. frame 크기가 바뀌면 다시 맞춘다. */
export function mountWarp(frame: HTMLElement, el: HTMLElement, quad: Quad): Warp {
  revealWhenDecoded(frame);
  let inv: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const fit = () => {
    const W = frame.clientWidth, H = frame.clientHeight;
    if (!W || !H) return;
    const pts = [quad.tl, quad.tr, quad.br, quad.bl].map(([x, y]) => [x * W, y * H] as [number, number]);
    const m = rectToQuad(el.offsetWidth, el.offsetHeight, pts);
    el.style.transform = css(m);
    inv = invert(m);
  };
  new ResizeObserver(fit).observe(frame);
  fit();
  const warp: Warp = {
    toLocal(cx, cy) {
      const r = frame.getBoundingClientRect();
      const [x, y] = apply(inv, cx - r.left, cy - r.top);
      return { x, y };
    },
  };
  warps.set(el, warp);
  return warp;
}

/**
 * 포인터 위치를 target 안의 0..1 비율로. target 이 얹은 화면 안에 있으면 변환을 거꾸로 풀어서 잰다.
 * (원근이 걸리면 getBoundingClientRect 는 기울어진 모양을 감싸는 바깥 상자라 쓸 수 없다)
 */
export function pointIn(target: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
  let root: HTMLElement | null = target;
  while (root && !warps.has(root)) root = root.parentElement;
  if (!root) {
    const r = target.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  }
  const p = warps.get(root)!.toLocal(clientX, clientY);
  // target 이 얹은 화면 안 어디에 있는지 (변환 전 배치 기준)
  let ox = 0, oy = 0;
  for (let el: HTMLElement | null = target; el && el !== root; el = el.offsetParent as HTMLElement | null) {
    ox += el.offsetLeft;
    oy += el.offsetTop;
  }
  return { x: (p.x - ox) / target.clientWidth, y: (p.y - oy) / target.clientHeight };
}
