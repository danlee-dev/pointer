// 효과 연출. 효과 하나 = Actor 하나. 누르면 만들고, 떼면 release, 다 끝나면 치운다.
// 층: 2D 캔버스(어둡게 깔기, 불꽃, 빛줄기, 먼지) → 3D 캔버스(북, 마이크, O/X, 꽃가루) → 번쩍임.
// 소리를 내는 창이면 sound 가 있고, 애니메이션이 정한 순간에 맞춰 소리를 예약한다.

import { Group, Mesh, Vector3, type Object3D } from 'three';
import type { Cue } from '@pointer/protocol';
import { CueSound, MIC_IMPACTS, type Hold } from './sound';
import { MIC, VIEW_H, World, makeDrum, makeMic, makeO, makeX, type DrumModel } from './world';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t * t;
/** 0 에서 1 로 튀어 오르며 한 번 넘쳤다 돌아오는 값 */
const spring = (t: number) => (t <= 0 ? 0 : 1 - Math.exp(-7 * t) * Math.cos(11 * t));
/** 들어갈 때 살짝 부풀었다 사라지는 값 (1 → 0) */
const shrink = (t: number) => {
  const u = clamp01(t);
  return 1 - (2.2 * u * u * u - 1.2 * u * u);
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

// 소리는 창마다 하나만 (AudioContext 는 비싸다)
let sharedSound: CueSound | null = null;
const getSound = () => (sharedSound ??= new CueSound());

interface Ctx {
  world: World | null;
  sound: CueSound | null;
  calm: boolean;
  size: () => { w: number; h: number };
  fireworks: Fireworks;
}

interface Actor {
  readonly cue: Cue;
  held: boolean;
  readonly uses3d: boolean;
  release(now: number): void;
  /** false 면 끝났다 */
  update(now: number, dt: number): boolean;
  draw2d?(g: CanvasRenderingContext2D, w: number, h: number, now: number): void;
  dim?(now: number): number;
  flash?(now: number): number;
  dispose(): void;
}

// ---------- 꽃가루 ----------

class ConfettiActor implements Actor {
  readonly cue = 'confetti';
  readonly uses3d = true;
  held = true;
  private next = 0;

  constructor(private c: Ctx, now: number) {
    this.fire(now);
  }

  private fire(now: number) {
    this.c.world?.confetti.burst(now, this.c.calm ? 24 : 60);
    this.c.sound?.pop();
    this.next = now + 380;
  }

  release() {
    this.held = false;
  }

  update(now: number) {
    if (this.held && now >= this.next) this.fire(now);
    return this.held;
  }

  dispose() {}
}

// ---------- 두구두구 ----------

const MIN_ROLL_MS = 1000; // 톡 눌러도 이만큼은 굴린다
const STICK_HIT_MS = 120; // 떼고 나서 막대가 북을 내려치기까지
const DRUM_STAY_MS = 1100;

class DrumActor implements Actor {
  readonly cue = 'drumroll';
  readonly uses3d = true;
  held = true;
  private start: number;
  private finishAt: number | null = null;
  private roll: Hold | null;

  constructor(
    private c: Ctx,
    private m: DrumModel | null,
    now: number,
  ) {
    this.start = now;
    this.roll = c.sound?.drumroll() ?? null;
    if (m) {
      m.group.position.set(0, -0.15, 0);
      m.group.scale.setScalar(0.0001);
      m.group.rotation.set(0, 0, 0);
      m.body.scale.set(1, 1, 1);
      c.world!.scene.add(m.group);
    }
  }

  release(now: number) {
    if (!this.held) return;
    this.held = false;
    this.finishAt = Math.max(now, this.start + MIN_ROLL_MS);
    this.roll?.finish((this.finishAt - now + STICK_HIT_MS) / 1000);
  }

  private hitAt() {
    return this.finishAt === null ? null : this.finishAt + STICK_HIT_MS;
  }

  update(now: number) {
    const t = (now - this.start) / 1000;
    const hit = this.hitAt();
    const m = this.m;
    if (m) {
      let scale = spring(t * 1.1) * 1.4;
      m.group.rotation.y = (1 - easeOut(clamp01(t / 0.5))) * -0.7;
      if (this.finishAt === null || now < this.finishAt) {
        // 굴리는 중: 두 막대가 번갈아 치고, 오래 굴릴수록 북이 더 떨린다
        const f = 6.5; // 소리와 같은 박자: 두 막대가 번갈아 초당 13번 남짓
        const level = Math.min(1, t / 3.5);
        m.setSticks(0.05 + 0.3 * Math.max(0, Math.sin(2 * Math.PI * f * t)), 0.05 + 0.3 * Math.max(0, Math.sin(2 * Math.PI * f * t + Math.PI)));
        m.body.position.y = this.c.calm ? 0 : Math.sin(t * 70) * 0.012 * (0.3 + level);
      } else {
        // 마무리: 두 막대를 크게 들었다가 동시에 내려친다
        const f = (now - this.finishAt) / 1000;
        const lift = f < 0.07 ? 0.4 + 0.9 * easeOut(f / 0.07) : f < 0.12 ? 1.3 * (1 - (f - 0.07) / 0.05) : 0.35 * (1 - Math.exp(-(f - 0.12) * 5));
        m.setSticks(lift, lift);
        m.body.position.y = 0;
        const s = f - 0.12;
        if (s >= 0 && !this.c.calm) {
          const k = Math.exp(-s * 9) * Math.cos(s * 28);
          m.body.scale.set(1 + 0.07 * k, 1 - 0.14 * k, 1 + 0.07 * k);
        }
        const out = (now - (hit! + DRUM_STAY_MS)) / 350;
        if (out > 0) scale *= shrink(out);
      }
      m.group.scale.setScalar(Math.max(0.0001, scale));
    }
    return hit === null || now < hit + DRUM_STAY_MS + 360;
  }

  dim(now: number) {
    const hit = this.hitAt();
    const t = (now - this.start) / 1000;
    if (hit === null || now < hit) return Math.min(0.5, 0.2 + t * 0.1);
    return 0.5 * (1 - clamp01((now - hit) / 700));
  }

  flash(now: number) {
    const hit = this.hitAt();
    if (hit === null || now < hit || this.c.calm) return 0;
    return 0.16 * (1 - clamp01((now - hit) / 320));
  }

  draw2d(g: CanvasRenderingContext2D, w: number, h: number, now: number) {
    const hit = this.hitAt();
    if (hit === null || now < hit) return;
    const u = (now - hit) / 750;
    if (u > 1) return;
    // 북 뒤로 퍼지는 빛줄기
    const center = this.m && this.c.world ? this.c.world.toScreen(this.m.group.position, w, h) : { x: w / 2, y: h / 2 };
    const len = h * (0.25 + 0.45 * easeOut(u));
    const n = 16;
    g.save();
    g.translate(center.x, center.y);
    g.rotate(u * 0.35);
    g.fillStyle = `rgba(255, 240, 205, ${0.5 * (1 - u)})`;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const spread = 0.07;
      g.beginPath();
      g.moveTo(Math.cos(a - spread) * len * 0.25, Math.sin(a - spread) * len * 0.25);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.lineTo(Math.cos(a + spread) * len * 0.25, Math.sin(a + spread) * len * 0.25);
      g.fill();
    }
    g.restore();
  }

  dispose() {
    this.roll?.stop();
    if (this.m) this.c.world?.scene.remove(this.m.group);
  }
}

// ---------- 박수 ----------

const MIN_APPLAUSE_MS = 2500;

class ApplauseActor implements Actor {
  readonly cue = 'applause';
  readonly uses3d = false;
  held = true;
  private start: number;
  private endAt = Infinity;
  private hold: Hold | null;

  constructor(c: Ctx, now: number) {
    this.start = now;
    this.hold = c.sound?.applause() ?? null;
  }

  release(now: number) {
    if (!this.held) return;
    this.held = false;
    const wait = Math.max(0, this.start + MIN_APPLAUSE_MS - now);
    this.hold?.finish(wait / 1000);
    this.endAt = now + wait + 2700; // 소리 쪽에서 한 명씩 그치는 2.4초보다 조금 길게
  }

  update(now: number) {
    return now < this.endAt;
  }

  dispose() {
    this.hold?.stop();
  }
}

// ---------- 불꽃놀이 (2D, 빛이라 겹쳐 그리기로 밝게) ----------

const FIRE_COLORS = ['#ffd27a', '#ff6fae', '#6fe3ff', '#8dff8a', '#b28dff', '#ffffff', '#ff9b4a'];

interface Spark {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Rocket {
  x0: number;
  x1: number;
  y1: number;
  t: number;
  flight: number;
  colors: string[];
}

class Fireworks {
  private rockets: Rocket[] = [];
  private sparks: Spark[] = [];
  private blooms: { x: number; y: number; t: number; color: string }[] = [];

  get busy() {
    return this.rockets.length > 0 || this.sparks.length > 0;
  }

  launch(w: number, h: number, sound: CueSound | null) {
    const flight = rand(0.85, 1.2);
    const x0 = w * rand(0.15, 0.85);
    const a = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]!;
    const b = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)]!;
    this.rockets.push({ x0, x1: x0 + rand(-0.05, 0.05) * w, y1: h * rand(0.16, 0.42), t: 0, flight, colors: [a, b] });
    sound?.rocket(flight, rand(0.7, 1));
  }

  update(dt: number, w: number, h: number, calm: boolean) {
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i]!;
      r.t += dt;
      const u = Math.min(1, r.t / r.flight);
      const x = r.x0 + (r.x1 - r.x0) * u;
      const y = h + (r.y1 - h) * (1 - (1 - u) ** 2);
      // 올라가는 꼬리
      this.sparks.push({ x, y, px: x, py: y, vx: rand(-12, 12), vy: rand(10, 40), life: 0, max: rand(0.25, 0.45), color: '#ffcf8a', size: 1.2 });
      if (u >= 1) {
        this.rockets.splice(i, 1);
        this.explode(x, y, r.colors, h, calm);
      }
    }
    const drag = Math.exp(-1.7 * dt);
    const gravity = h * 0.1;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]!;
      s.life += dt;
      if (s.life >= s.max) {
        this.sparks[i] = this.sparks[this.sparks.length - 1]!;
        this.sparks.pop();
        continue;
      }
      s.px = s.x;
      s.py = s.y;
      s.vx *= drag;
      s.vy = s.vy * drag + gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.blooms = this.blooms.filter((b) => (b.t += dt) < 0.22);
    void w;
  }

  private explode(x: number, y: number, colors: string[], h: number, calm: boolean) {
    const n = calm ? 50 : 110;
    const speed = h * 0.55;
    for (let i = 0; i < n; i++) {
      // 구 표면의 점을 화면에 비춘 방향: 가운데가 촘촘해서 입체 공처럼 보인다
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const v = speed * rand(0.92, 1.05);
      this.sparks.push({
        x,
        y,
        px: x,
        py: y,
        vx: r * Math.cos(th) * v,
        vy: r * Math.sin(th) * v,
        life: 0,
        max: rand(1.2, 1.9),
        color: colors[i % colors.length]!,
        size: rand(1.6, 2.6),
      });
    }
    this.blooms.push({ x, y, t: 0, color: colors[0]! });
  }

  draw(g: CanvasRenderingContext2D, h: number) {
    g.save();
    // 번쩍임만 더해 그리고, 불똥은 보통으로 그린다. 더해 그리면 흰 슬라이드에서 안 보인다.
    g.globalCompositeOperation = 'lighter';
    for (const b of this.blooms) {
      const a = 0.28 * (1 - b.t / 0.22);
      const R = h * 0.06;
      const grad = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, R);
      grad.addColorStop(0, `rgba(255,255,255,${a})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(b.x - R, b.y - R, R * 2, R * 2);
    }
    g.globalCompositeOperation = 'source-over';
    g.lineCap = 'round';
    const unit = h / 520;
    for (const pass of [0, 1]) {
      for (const s of this.sparks) {
        const left = 1 - s.life / s.max;
        // 끝무렵엔 반짝반짝
        const twinkle = left < 0.3 ? (Math.random() < 0.5 ? 0.25 : 1) : 1;
        const alpha = Math.min(1, left * 1.6) * twinkle;
        g.globalAlpha = pass === 0 ? alpha * 0.14 : alpha;
        g.strokeStyle = s.color;
        g.lineWidth = s.size * unit * (pass === 0 ? 2.2 : 0.75);
        // 지나온 길을 꼬리로: 빠를수록 길다
        g.beginPath();
        g.moveTo(s.x - (s.x - s.px) * 6, s.y - (s.y - s.py) * 6);
        g.lineTo(s.x, s.y);
        g.stroke();
      }
    }
    g.restore();
  }
}

class FireworksActor implements Actor {
  readonly cue = 'fireworks';
  readonly uses3d = false;
  held = true;
  private next = 0;
  private count = 0;

  constructor(
    private c: Ctx,
    now: number,
  ) {
    this.launch(now);
  }

  private launch(now: number) {
    const { w, h } = this.c.size();
    this.c.fireworks.launch(w, h, this.c.sound);
    this.count++;
    this.next = now + (this.count < 3 ? 260 : 480);
  }

  release() {
    this.held = false;
  }

  update(now: number) {
    // 톡 눌러도 세 발은 쏜다
    const more = this.held || this.count < 3;
    if (more && now >= this.next) this.launch(now);
    return more;
  }

  dispose() {}
}

// ---------- 마이크 드롭 ----------

const MIC_STAY_MS = 2600;

class MicActor implements Actor {
  readonly cue = 'micdrop';
  readonly uses3d = true;
  held = false;
  private start: number;
  private x: number;
  private dir: number;
  private hits = 0;
  private dust: { x: number; y: number; vx: number; r: number; t: number }[] = [];

  constructor(
    private c: Ctx,
    private m: Group | null,
    now: number,
  ) {
    this.start = now;
    this.x = rand(-0.6, 0.6);
    this.dir = Math.random() < 0.5 ? -1 : 1;
    c.sound?.micdrop();
    if (m) {
      m.scale.setScalar(1);
      c.world!.scene.add(m);
    }
  }

  release() {}

  update(now: number, dt: number) {
    const t = (now - this.start) / 1000;
    const [t1, t2, t3] = MIC_IMPACTS;
    const floor = -VIEW_H / 2 + 0.55;
    // 기울기: 떨어지는 동안 살짝, 바닥에 닿은 뒤 옆으로 눕는다
    const lying = 1.38;
    const theta = this.dir * (t < t1 ? 0.12 + 0.12 * t : 0.18 + (lying - 0.18) * easeOut(clamp01((t - t1) / 0.6)));
    let height = 0;
    if (t < t1) height = (VIEW_H + 1.5) * (1 - (t / t1) ** 2);
    else if (t < t2) height = 0.55 * 4 * ((t - t1) / (t2 - t1)) * (1 - (t - t1) / (t2 - t1));
    else if (t < t3) height = 0.12 * 4 * ((t - t2) / (t3 - t2)) * (1 - (t - t2) / (t3 - t2));
    const cos = Math.cos(theta);
    const low = Math.min(MIC.headY * cos - MIC.headR, MIC.tailY * cos - MIC.tailR);

    // 바닥에 닿는 순간: 흔들림과 먼지
    const crossed = MIC_IMPACTS.filter((at) => t >= at).length;
    if (crossed > this.hits) {
      const power = crossed === 1 ? 1 : crossed === 2 ? 0.45 : 0.2;
      this.hits = crossed;
      if (!this.c.calm) this.c.world?.shake(0.16 * power, 320);
      this.puff(power);
    }
    this.dust = this.dust.filter((d) => (d.t += dt) < 0.7);

    if (this.m) {
      this.m.position.set(this.x, floor - low + height, 0);
      this.m.rotation.set(0, 0, theta);
      const since = t - MIC_IMPACTS[Math.max(0, this.hits - 1)]!;
      if (this.hits > 0 && !this.c.calm) {
        const k = Math.exp(-since * 14) * Math.cos(since * 30) * (this.hits === 1 ? 1 : 0.4);
        this.m.scale.set(1 + 0.06 * k, 1 - 0.1 * k, 1);
      }
      const out = (now - (this.start + MIC_STAY_MS)) / 350;
      if (out > 0) this.m.scale.setScalar(Math.max(0.0001, shrink(out)));
    }
    return now < this.start + MIC_STAY_MS + 360;
  }

  private puff(power: number) {
    const { w, h } = this.c.size();
    const at = this.m && this.c.world ? this.c.world.toScreen(new Vector3(this.x, -VIEW_H / 2 + 0.55, 0), w, h) : { x: w / 2, y: h * 0.85 };
    for (let i = 0; i < Math.round(10 * power) + 2; i++) {
      this.dust.push({ x: at.x + rand(-40, 40), y: at.y + rand(-6, 6), vx: rand(-1, 1) * h * 0.25 * power, r: h * rand(0.015, 0.03), t: 0 });
    }
  }

  draw2d(g: CanvasRenderingContext2D, _w: number, h: number) {
    for (const d of this.dust) {
      const u = d.t / 0.7;
      const x = d.x + d.vx * easeOut(u) * 0.7;
      const y = d.y - h * 0.02 * u;
      const r = d.r * (1 + 2 * u);
      // 가장자리가 흐린 연기 뭉치
      const puff = g.createRadialGradient(x, y, 0, x, y, r);
      puff.addColorStop(0, `rgba(232, 226, 214, ${0.4 * (1 - u)})`);
      puff.addColorStop(1, 'rgba(232, 226, 214, 0)');
      g.fillStyle = puff;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  dispose() {
    if (this.m) this.c.world?.scene.remove(this.m);
  }
}

// ---------- 딩동댕 (O) / 땡 (X) ----------

const MARK_STAY_MS = 1500;
const X_SLAM_MS = 160;

class MarkActor implements Actor {
  readonly uses3d = true;
  held = false;
  private start: number;
  private shook = false;

  constructor(
    readonly cue: 'correct' | 'wrong',
    private c: Ctx,
    private m: Object3D | null,
    now: number,
  ) {
    this.start = now;
    if (cue === 'correct') c.sound?.correct();
    else c.sound?.wrong(X_SLAM_MS / 1000);
    if (m) {
      m.position.set(0, 0.15, 0);
      m.scale.setScalar(0.0001);
      c.world!.scene.add(m);
    }
  }

  release() {}

  update(now: number) {
    const t = (now - this.start) / 1000;
    const m = this.m;
    if (m) {
      let scale: number;
      if (this.cue === 'correct') {
        // 빙글 돌며 튀어 나와 둥실
        scale = spring(t * 1.2) * 1.2;
        m.rotation.set(0.2 * Math.sin(t * 2.2), (1 - easeOut(clamp01(t / 0.7))) * -Math.PI * 2, 0);
        m.position.y = 0.15 + 0.06 * Math.sin(t * 3);
      } else {
        // 멀리서 화면 쪽으로 쾅 찍히고 부르르
        const u = clamp01((now - this.start) / X_SLAM_MS);
        scale = u < 1 ? 3 - 1.9 * easeIn(u) : 1.1;
        const s = t - X_SLAM_MS / 1000;
        m.position.x = s > 0 && !this.c.calm ? 0.14 * Math.exp(-s * 8) * Math.sin(s * 60) : 0;
        m.rotation.set(0, 0, -0.15 * (1 - u));
        if (s > 0 && !this.shook) {
          this.shook = true;
          if (!this.c.calm) this.c.world?.shake(0.1, 250);
        }
      }
      const out = (now - (this.start + MARK_STAY_MS)) / 300;
      if (out > 0) scale *= shrink(out);
      m.scale.setScalar(Math.max(0.0001, scale));
    }
    return now < this.start + MARK_STAY_MS + 310;
  }

  draw2d(g: CanvasRenderingContext2D, w: number, h: number, now: number) {
    // 처음 나타날 때 퍼지는 고리
    const u = (now - this.start - (this.cue === 'wrong' ? X_SLAM_MS : 40)) / 550;
    if (u < 0 || u > 1) return;
    const center = this.m && this.c.world ? this.c.world.toScreen(this.m.position, w, h) : { x: w / 2, y: h / 2 };
    g.strokeStyle = this.cue === 'correct' ? `rgba(47, 123, 255, ${0.55 * (1 - u)})` : `rgba(255, 59, 48, ${0.55 * (1 - u)})`;
    g.lineWidth = h * 0.012 * (1 - u) + 1;
    g.beginPath();
    g.arc(center.x, center.y, h * (0.18 + 0.3 * easeOut(u)), 0, Math.PI * 2);
    g.stroke();
  }

  dispose() {
    if (this.m) this.c.world?.scene.remove(this.m);
  }
}

// ---------- 엔진 ----------

/** 한 번에 하나만 보이는 효과. 또 누르면 이전 것을 바로 치우고 새로 시작한다 */
const SINGLE = new Set<Cue>(['drumroll', 'micdrop', 'correct', 'wrong']);

export class CueEngine {
  private c2d: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private glCanvas: HTMLCanvasElement;
  private flashEl: HTMLDivElement;
  private world: World | null = null;
  private worldFailed = false;
  private drawn3d = false;
  private models: { drum?: DrumModel; mic?: Group; o?: Mesh; x?: Group } = {};
  private actors: Actor[] = [];
  private fireworks = new Fireworks();
  private dimNow = 0;
  private raf = 0;
  private last = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private ro: ResizeObserver;

  constructor(host: HTMLElement) {
    const layer = (el: HTMLElement) => {
      Object.assign(el.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
      host.appendChild(el);
      return el;
    };
    this.c2d = layer(document.createElement('canvas')) as HTMLCanvasElement;
    this.g = this.c2d.getContext('2d')!;
    this.glCanvas = layer(document.createElement('canvas')) as HTMLCanvasElement;
    this.flashEl = layer(document.createElement('div')) as HTMLDivElement;
    Object.assign(this.flashEl.style, { background: '#fff', opacity: '0' });
    this.ro = new ResizeObserver(([e]) => {
      this.w = Math.floor(e!.contentRect.width);
      this.h = Math.floor(e!.contentRect.height);
      this.dpr = window.devicePixelRatio || 1;
      this.c2d.width = Math.max(1, Math.round(this.w * this.dpr));
      this.c2d.height = Math.max(1, Math.round(this.h * this.dpr));
      this.world?.resize(this.w, this.h, this.dpr);
    });
    this.ro.observe(host);
    getSound().preload();
  }

  /** WebGL 을 못 쓰는 환경이면 3D 물체 없이 소리와 2D 효과만 낸다 */
  private ensureWorld(): World | null {
    if (this.world || this.worldFailed) return this.world;
    try {
      this.world = new World(this.glCanvas);
      this.world.resize(this.w, this.h, this.dpr);
    } catch (err) {
      console.warn('[cues] 3D 를 켤 수 없음', err);
      this.worldFailed = true;
    }
    return this.world;
  }

  handle(cue: Cue, on: boolean, audio: boolean) {
    const now = performance.now();
    if (!on) {
      for (const a of this.actors) if (a.cue === cue && a.held) a.release(now);
      return;
    }
    if (this.actors.some((a) => a.cue === cue && a.held)) return;
    if (SINGLE.has(cue)) {
      this.actors = this.actors.filter((a) => {
        if (a.cue !== cue) return true;
        a.dispose();
        return false;
      });
    }
    const world = cue === 'applause' || cue === 'fireworks' ? this.world : this.ensureWorld();
    const ctx: Ctx = {
      world,
      sound: audio ? getSound() : null,
      calm: reducedMotion(),
      size: () => ({ w: this.w, h: this.h }),
      fireworks: this.fireworks,
    };
    const m = this.models;
    let actor: Actor;
    switch (cue) {
      case 'confetti':
        actor = new ConfettiActor(ctx, now);
        break;
      case 'drumroll':
        actor = new DrumActor(ctx, world ? (m.drum ??= makeDrum()) : null, now);
        break;
      case 'applause':
        actor = new ApplauseActor(ctx, now);
        break;
      case 'fireworks':
        actor = new FireworksActor(ctx, now);
        break;
      case 'micdrop':
        actor = new MicActor(ctx, world ? (m.mic ??= makeMic()) : null, now);
        break;
      case 'correct':
        actor = new MarkActor('correct', ctx, world ? (m.o ??= makeO()) : null, now);
        break;
      case 'wrong':
        actor = new MarkActor('wrong', ctx, world ? (m.x ??= makeX()) : null, now);
        break;
    }
    this.actors.push(actor);
    this.kick();
  }

  private kick() {
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const calm = reducedMotion();

    this.actors = this.actors.filter((a) => {
      if (a.update(now, dt)) return true;
      a.dispose();
      return false;
    });
    this.world?.confetti.update(now, dt);
    this.fireworks.update(dt, this.w, this.h, calm);

    const dimTarget = Math.max(this.fireworks.busy ? 0.42 : 0, ...this.actors.map((a) => a.dim?.(now) ?? 0));
    this.dimNow += (dimTarget - this.dimNow) * Math.min(1, dt * 6);
    const flash = Math.max(0, ...this.actors.map((a) => a.flash?.(now) ?? 0));

    // 2D
    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    if (this.dimNow > 0.003) {
      g.fillStyle = `rgba(12, 10, 9, ${this.dimNow})`;
      g.fillRect(0, 0, this.w, this.h);
    }
    this.fireworks.draw(g, this.h);
    for (const a of this.actors) a.draw2d?.(g, this.w, this.h, now);
    this.flashEl.style.opacity = flash.toFixed(3);

    // 3D: 보여 줄 게 있을 때만 그린다. 다 끝나면 한 번 지우고 쉰다.
    const confettiBusy = this.world?.confetti.busy ?? false;
    const show3d = confettiBusy || this.actors.some((a) => a.uses3d);
    if (this.world && show3d) {
      this.world.render(now);
      this.drawn3d = true;
    } else if (this.world && this.drawn3d) {
      this.world.clear();
      this.drawn3d = false;
    }

    if (this.actors.length || confettiBusy || this.fireworks.busy || this.dimNow > 0.003 || flash > 0) this.kick();
    else {
      g.clearRect(0, 0, this.w, this.h);
      this.dimNow = 0;
    }
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const a of this.actors) a.dispose();
    this.actors = [];
    this.ro.disconnect();
    this.world?.dispose();
    this.world = null;
  }
}
