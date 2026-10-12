// 슬라이드 위에 그리는 효과: 레이저(꼬리 포함), 스포트라이트, 돋보기, 판서.
// 폰에서 오는 좌표는 띄엄띄엄(와이파이 사정에 따라 20~60Hz) 오므로,
// 받은 좌표를 목표점으로 두고 매 프레임 따라가게 보간해서 부드럽게 보이게 한다.

import type { PenColor, Tool } from '@pointer/protocol';

type PointerTool = Exclude<Tool, 'pen'>;

export const PEN_COLOR: Record<PenColor, string> = {
  red: '#ff3b30',
  yellow: '#ffd60a',
  blue: '#2f8bff',
  white: '#ffffff',
};

const LASER = '#ff3b30';
const TRAIL_MS = 200;
const FOLLOW = 0.45; // 프레임마다 목표점까지 남은 거리의 45% 를 간다
const SPOT_DIM = 0.8;
const ZOOM = 2.4;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface StrokeData {
  color: PenColor;
  pts: number[];
}

export class FxEngine {
  private fx: CanvasRenderingContext2D;
  private ink: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;

  private tool: PointerTool = 'laser';
  private on = false;
  private target = { x: 0.5, y: 0.5 };
  private cur = { x: 0.5, y: 0.5 };
  private trail: { x: number; y: number; t: number }[] = [];
  /** 켜고 끌 때 서서히 나타나고 사라지는 정도 0..1 */
  private presence = 0;
  private raf = 0;

  private strokes = new Map<string, StrokeData>();

  /** 돋보기가 확대할 고해상도 그림. 없으면 현재 장 그림을 늘려서 쓴다 */
  magnifySource: () => CanvasImageSource | null = () => null;

  constructor(fxCanvas: HTMLCanvasElement, inkCanvas: HTMLCanvasElement) {
    this.fx = fxCanvas.getContext('2d')!;
    this.ink = inkCanvas.getContext('2d')!;
  }

  resize(w: number, h: number, dpr: number) {
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    for (const ctx of [this.fx, this.ink]) {
      ctx.canvas.width = Math.max(1, Math.round(w * dpr));
      ctx.canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.redrawInk();
    this.kick();
  }

  pointer(p: { tool: PointerTool; on: boolean; x: number; y: number }) {
    if (p.on) {
      this.target = { x: p.x, y: p.y };
      if (!this.on || this.tool !== p.tool) {
        // 새로 누른 자리에서 바로 시작한다. 이전 위치에서 미끄러져 오지 않게.
        this.cur = { ...this.target };
        this.trail = [];
      }
      this.tool = p.tool;
    }
    this.on = p.on;
    this.kick();
  }

  // ---------- 판서 ----------

  inkAppend(id: string, color: PenColor, pts: number[]) {
    let s = this.strokes.get(id);
    const from = s ? s.pts.length : 0;
    if (!s) {
      s = { color, pts: [] };
      this.strokes.set(id, s);
    }
    s.pts.push(...pts);
    this.drawStroke(s, Math.max(0, from - 2));
  }

  inkSet(list: { id: string; color: PenColor; pts: number[] }[]) {
    this.strokes = new Map(list.map((s) => [s.id, { color: s.color, pts: [...s.pts] }]));
    this.redrawInk();
  }

  inkClear() {
    this.strokes.clear();
    this.redrawInk();
  }

  private redrawInk() {
    this.ink.clearRect(0, 0, this.w, this.h);
    for (const s of this.strokes.values()) this.drawStroke(s, 0);
  }

  /** start 번째 좌표부터 이어 그린다 (새로 온 점만 그리면 되니까) */
  private drawStroke(s: StrokeData, start: number) {
    const ctx = this.ink;
    const { w, h } = this;
    ctx.strokeStyle = PEN_COLOR[s.color];
    ctx.fillStyle = PEN_COLOR[s.color];
    ctx.lineWidth = Math.max(2.5, w * 0.0042);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pts = s.pts;
    if (pts.length === 2 && start === 0) {
      // 톡 찍은 점
      ctx.beginPath();
      ctx.arc(pts[0]! * w, pts[1]! * h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pts[start]! * w, pts[start + 1]! * h);
    for (let i = start + 2; i < pts.length; i += 2) ctx.lineTo(pts[i]! * w, pts[i + 1]! * h);
    ctx.stroke();
  }

  // ---------- 매 프레임 ----------

  private kick() {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (t: number) => {
    this.raf = 0;
    const calm = reducedMotion();
    this.cur.x += (this.target.x - this.cur.x) * (calm ? 1 : FOLLOW);
    this.cur.y += (this.target.y - this.cur.y) * (calm ? 1 : FOLLOW);
    this.presence = this.on ? Math.min(1, this.presence + 0.25) : Math.max(0, this.presence - 0.2);

    if (this.on && this.tool === 'laser' && !calm) this.trail.push({ x: this.cur.x, y: this.cur.y, t });
    this.trail = this.trail.filter((p) => t - p.t < TRAIL_MS);

    const ctx = this.fx;
    ctx.clearRect(0, 0, this.w, this.h);
    if (this.presence > 0) {
      ctx.save();
      ctx.globalAlpha = this.presence;
      if (this.tool === 'laser') this.drawLaser(t);
      else if (this.tool === 'spotlight') this.drawSpotlight();
      else this.drawMagnifier();
      ctx.restore();
    }

    const moving = Math.abs(this.target.x - this.cur.x) + Math.abs(this.target.y - this.cur.y) > 0.0005;
    if (this.on || this.presence > 0 || this.trail.length > 0 || moving) this.kick();
  };

  private drawLaser(t: number) {
    const ctx = this.fx;
    const { w, h } = this;
    const r = Math.min(22, Math.max(7, w * 0.0085));

    // 꼬리: 오래된 점일수록 얇고 흐리게
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1]!;
      const b = this.trail[i]!;
      const life = 1 - (t - b.t) / TRAIL_MS;
      ctx.strokeStyle = `rgba(255, 59, 48, ${0.5 * life})`;
      ctx.lineWidth = r * 1.1 * life;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }

    const x = this.cur.x * w;
    const y = this.cur.y * h;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    glow.addColorStop(0, 'rgba(255, 59, 48, 0.55)');
    glow.addColorStop(1, 'rgba(255, 59, 48, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(x, y, 0, x, y, r);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.3, '#ff8a80');
    core.addColorStop(0.7, LASER);
    core.addColorStop(1, 'rgba(255, 59, 48, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSpotlight() {
    const ctx = this.fx;
    const { w, h } = this;
    const R = Math.min(w, h) * 0.17;
    const x = this.cur.x * w;
    const y = this.cur.y * h;
    ctx.fillStyle = `rgba(0, 0, 0, ${SPOT_DIM})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    const hole = ctx.createRadialGradient(x, y, R * 0.82, x, y, R);
    hole.addColorStop(0, 'rgba(0,0,0,1)');
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawMagnifier() {
    const src = this.magnifySource();
    if (!src) return;
    const ctx = this.fx;
    const { w, h } = this;
    const R = Math.min(w, h) * 0.18;
    const x = this.cur.x * w;
    const y = this.cur.y * h;
    const sw = (src as { width: number }).width;
    const sh = (src as { height: number }).height;
    // 화면에서 지름 2R 인 원 안에, 원본의 (2R / ZOOM) 만큼을 키워 넣는다
    const regionW = ((2 * R) / ZOOM) * (sw / w);
    const regionH = ((2 * R) / ZOOM) * (sh / h);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.clip();
    try {
      ctx.drawImage(src, this.cur.x * sw - regionW / 2, this.cur.y * sh - regionH / 2, regionW, regionH, x - R, y - R, 2 * R, 2 * R);
    } catch {
      // 캐시에서 밀려나 닫힌 그림이면 이번 프레임은 흰 원만 보인다. 다음 장에서 다시 그린다.
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.stroke();
  }
}
