// 효과 연출 (홈페이지용 가벼운 2D 판). 데스크톱 앱의 cues/engine.ts 를 three.js 없이 캔버스 하나로 흉내 낸다.
// 효과 하나 = Actor 하나. 누르면 만들고, 떼면 release, 다 끝나면 치운다. 소리는 내지 않는다.

export type Cue = 'confetti' | 'drumroll' | 'applause' | 'fireworks' | 'micdrop' | 'correct' | 'wrong';

/** 컴퓨터에서 누르는 키 (데스크톱 앱과 같다) */
export const CUE_KEYS: Record<string, Cue> = {
  c: 'confetti',
  d: 'drumroll',
  a: 'applause',
  r: 'fireworks',
  m: 'micdrop',
  o: 'correct',
  x: 'wrong',
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;
/** 0 에서 1 로 튀어 오르며 한 번 넘쳤다 돌아오는 값 */
const spring = (t: number) => (t <= 0 ? 0 : 1 - Math.exp(-7 * t) * Math.cos(11 * t));
/** 들어갈 때 살짝 부풀었다 사라지는 값 (1 -> 0) */
const shrink = (t: number) => {
  const u = clamp01(t);
  return Math.max(0, 1 - (2.2 * u * u * u - 1.2 * u * u));
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;

// 효과 안의 색은 청중 화면에 나가는 "연출" 이라 UI 토큰이 아니다 (데스크톱 앱과 같은 값)
const CONFETTI = ['#ff5c5c', '#ffb02e', '#ffd60a', '#34c759', '#2f8bff', '#af52de', '#ff7ac6', '#ffffff', '#5ac8fa'];
const FIRE = ['#ffd27a', '#ff6fae', '#6fe3ff', '#8dff8a', '#b28dff', '#ffffff', '#ff9b4a'];

interface Ctx {
  calm: boolean;
  w: () => number;
  h: () => number;
}

interface Actor {
  readonly cue: Cue;
  held: boolean;
  release(now: number): void;
  /** false 면 끝났다 */
  update(now: number, dt: number): boolean;
  draw?(g: CanvasRenderingContext2D, w: number, h: number, now: number): void;
  dim?(now: number): number;
  flash?(now: number): number;
}

// ---------- 꽃가루 ----------

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  flip: number;
  vf: number;
  sway: number;
  size: number;
  color: string;
  born: number;
}

class Confetti implements Actor {
  readonly cue = 'confetti';
  held = true;
  private bits: Bit[] = [];
  private next = 0;

  constructor(private c: Ctx, now: number) {
    this.burst(now);
    this.next = now + 420;
  }

  private burst(now: number) {
    const w = this.c.w();
    const h = this.c.h();
    const n = this.c.calm ? 36 : 64;
    for (let i = 0; i < n && this.bits.length < 520; i++) {
      const left = i % 2 === 0;
      if (this.c.calm) {
        this.bits.push(this.bit(rand(0.05, 0.95) * w, rand(0.05, 0.75) * h, 0, 0, now));
        continue;
      }
      const a = -Math.PI / 2 + (left ? 1 : -1) * rand(0.18, 0.62);
      const v = h * rand(1.25, 2.05);
      this.bits.push(this.bit(left ? w * 0.02 : w * 0.98, h * 1.02, Math.cos(a) * v, Math.sin(a) * v, now));
    }
  }

  private bit(x: number, y: number, vx: number, vy: number, now: number): Bit {
    return {
      x,
      y,
      vx,
      vy,
      rot: rand(0, Math.PI * 2),
      vr: rand(-6, 6),
      flip: rand(0, Math.PI * 2),
      vf: rand(5, 11),
      sway: rand(0, Math.PI * 2),
      size: rand(0.7, 1.25),
      color: pick(CONFETTI),
      born: now,
    };
  }

  release() {
    this.held = false;
  }

  update(now: number, dt: number) {
    if (this.held && now >= this.next) {
      this.burst(now);
      this.next = now + 420;
    }
    const h = this.c.h();
    const g = h * 1.6;
    const drag = Math.exp(-1.7 * dt);
    for (const b of this.bits) {
      if (this.c.calm) continue;
      b.vy = Math.min(b.vy + g * dt, h * 0.32);
      b.vx *= drag;
      b.x += (b.vx + Math.sin(now / 260 + b.sway) * h * 0.05) * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
      b.flip += b.vf * dt;
    }
    // 차분 모드: 제자리에서 1.6초 머물다 사라진다
    this.bits = this.bits.filter((b) => (this.c.calm ? now - b.born < 1600 : b.y < h + 24));
    return this.held || this.bits.length > 0;
  }

  draw(g: CanvasRenderingContext2D, w: number, _h: number, now: number) {
    const unit = w * 0.011;
    for (const b of this.bits) {
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.rot);
      g.scale(1, Math.cos(b.flip));
      g.globalAlpha = this.c.calm ? 1 - clamp01((now - b.born - 1100) / 500) : 1;
      g.fillStyle = b.color;
      g.fillRect(-unit * b.size, -unit * 0.55 * b.size, unit * 2 * b.size, unit * 1.1 * b.size);
      g.restore();
    }
  }
}

// ---------- 두구두구 ----------

const MIN_ROLL_MS = 900;
const STICK_HIT_MS = 120;
const DRUM_STAY_MS = 650;

class Drum implements Actor {
  readonly cue = 'drumroll';
  held = true;
  private start: number;
  private finishAt: number | null = null;

  constructor(private c: Ctx, now: number) {
    this.start = now;
  }

  release(now: number) {
    if (!this.held) return;
    this.held = false;
    this.finishAt = Math.max(now, this.start + MIN_ROLL_MS);
  }

  private hitAt() {
    return this.finishAt === null ? null : this.finishAt + STICK_HIT_MS;
  }

  update(now: number) {
    const hit = this.hitAt();
    return hit === null || now < hit + DRUM_STAY_MS + 380;
  }

  dim(now: number) {
    const hit = this.hitAt();
    const t = (now - this.start) / 1000;
    if (hit === null || now < hit) return Math.min(0.5, 0.2 + t * 0.12);
    return 0.5 * (1 - clamp01((now - hit) / 700));
  }

  flash(now: number) {
    const hit = this.hitAt();
    if (hit === null || now < hit || this.c.calm) return 0;
    return 0.2 * (1 - clamp01((now - hit) / 320));
  }

  draw(g: CanvasRenderingContext2D, w: number, h: number, now: number) {
    const t = (now - this.start) / 1000;
    const hit = this.hitAt();
    const R = h * 0.2;
    const cx = w / 2;
    const cy = h * 0.6;

    let scale = this.c.calm ? 1 : spring(t * 1.2);
    let lift = 0;
    let shakeY = 0;
    if (this.finishAt === null || now < this.finishAt) {
      // 굴리는 중: 두 막대가 번갈아 치고, 오래 굴릴수록 북이 더 떨린다
      const f = 6.5;
      const level = Math.min(1, t / 3);
      lift = this.c.calm ? 0.2 : 0.05 + 0.3 * Math.max(0, Math.sin(2 * Math.PI * f * t));
      shakeY = this.c.calm ? 0 : Math.sin(t * 70) * h * 0.003 * (0.3 + level);
      this.drawDrum(g, cx, cy + shakeY, R * scale, lift, 0.05 + 0.3 * Math.max(0, Math.sin(2 * Math.PI * f * t + Math.PI)));
    } else {
      // 마무리: 두 막대를 크게 들었다가 동시에 내려친다
      const s = (now - this.finishAt) / 1000;
      lift = s < 0.07 ? 0.4 + 0.9 * easeOut(s / 0.07) : s < 0.12 ? 1.3 * (1 - (s - 0.07) / 0.05) : 0.35 * (1 - Math.exp(-(s - 0.12) * 5));
      if (this.c.calm) lift = 0.3;
      const out = hit === null ? 0 : (now - (hit + DRUM_STAY_MS)) / 350;
      if (out > 0) scale *= shrink(out);
      if (hit !== null && now >= hit) this.rays(g, cx, cy - R * 0.2, h, (now - hit) / 750);
      this.drawDrum(g, cx, cy, R * scale, lift, lift);
    }
  }

  /** 북 뒤로 퍼지는 빛줄기 */
  private rays(g: CanvasRenderingContext2D, x: number, y: number, h: number, u: number) {
    if (u > 1 || this.c.calm) return;
    const len = h * (0.25 + 0.5 * easeOut(u));
    const n = 16;
    g.save();
    g.translate(x, y);
    g.rotate(u * 0.35);
    g.fillStyle = `rgba(255, 240, 205, ${0.5 * (1 - u)})`;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(a - 0.07) * len * 0.25, Math.sin(a - 0.07) * len * 0.25);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.lineTo(Math.cos(a + 0.07) * len * 0.25, Math.sin(a + 0.07) * len * 0.25);
      g.fill();
    }
    g.restore();
  }

  private drawDrum(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, liftL: number, liftR: number) {
    if (R < 1) return;
    const rx = R;
    const ry = R * 0.3;
    const H = R * 0.72;
    const top = cy - H / 2;
    const bottom = cy + H / 2;

    // 몸통: 가운데가 밝은 빨간 원통
    const body = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
    body.addColorStop(0, '#8f1f19');
    body.addColorStop(0.38, '#e2473d');
    body.addColorStop(0.5, '#ff7a6e');
    body.addColorStop(0.62, '#d8382f');
    body.addColorStop(1, '#7d1a15');
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(cx - rx, top);
    g.lineTo(cx - rx, bottom);
    g.ellipse(cx, bottom, rx, ry, 0, Math.PI, 0, true);
    g.lineTo(cx + rx, top);
    g.ellipse(cx, top, rx, ry, 0, 0, Math.PI, false);
    g.closePath();
    g.fill();

    // 조임쇠
    g.strokeStyle = '#e4e7ec';
    g.lineWidth = R * 0.05;
    g.lineCap = 'round';
    for (const k of [-0.72, -0.36, 0, 0.36, 0.72]) {
      const x = cx + rx * k;
      const dy = ry * Math.sqrt(1 - k * k);
      g.beginPath();
      g.moveTo(x, top + dy + H * 0.12);
      g.lineTo(x, bottom + dy - H * 0.12);
      g.stroke();
    }

    // 테두리 (위, 아래)
    g.lineWidth = R * 0.07;
    g.strokeStyle = '#d7dbe1';
    g.beginPath();
    g.ellipse(cx, bottom, rx, ry, 0, 0, Math.PI);
    g.stroke();

    // 북 가죽
    const head = g.createRadialGradient(cx - rx * 0.3, top - ry * 0.4, R * 0.1, cx, top, rx);
    head.addColorStop(0, '#ffffff');
    head.addColorStop(1, '#e9e3d6');
    g.fillStyle = head;
    g.beginPath();
    g.ellipse(cx, top, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#d7dbe1';
    g.stroke();

    // 막대 두 개: 끝은 북 가죽 위, 손잡이는 바깥 위쪽
    const stick = (side: -1 | 1, lift: number) => {
      const tipX = cx + side * rx * 0.32;
      const tipY = top - ry * 0.2 - lift * R * 0.75;
      const tailX = cx + side * rx * 1.55;
      const tailY = top - R * 1.25 - lift * R * 0.35;
      g.strokeStyle = '#d9a066';
      g.lineWidth = R * 0.075;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(tailX, tailY);
      g.lineTo(tipX, tipY);
      g.stroke();
      g.fillStyle = '#e8b880';
      g.beginPath();
      g.arc(tipX, tipY, R * 0.06, 0, Math.PI * 2);
      g.fill();
    };
    stick(-1, liftL);
    stick(1, liftR);
  }
}

// ---------- 박수 (소리만 나는 효과: 화면에는 아무것도 그리지 않는다) ----------

const MIN_APPLAUSE_MS = 2500;

class Applause implements Actor {
  readonly cue = 'applause';
  held = true;
  private start: number;
  private endAt = Infinity;

  constructor(now: number) {
    this.start = now;
  }

  release(now: number) {
    if (!this.held) return;
    this.held = false;
    this.endAt = Math.max(now, this.start + MIN_APPLAUSE_MS) + 1200;
  }

  update(now: number) {
    return now < this.endAt;
  }
}

// ---------- 불꽃놀이 ----------

interface Rocket {
  x: number;
  y: number;
  vy: number;
  top: number;
  a: string;
  b: string;
}
interface Spark {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
  color: string;
}

class Fireworks implements Actor {
  readonly cue = 'fireworks';
  held = true;
  private rockets: Rocket[] = [];
  private sparks: Spark[] = [];
  private next = 0;
  private start: number;
  private quietSince: number | null = null;

  constructor(private c: Ctx, now: number) {
    this.start = now;
    this.launch();
    if (!c.calm) this.launch();
    this.next = now + 380;
  }

  private launch() {
    const w = this.c.w();
    const h = this.c.h();
    const r: Rocket = {
      x: w * rand(0.18, 0.82),
      y: h * 1.02,
      vy: -h * rand(1.35, 1.7),
      top: h * rand(0.18, 0.42),
      a: pick(FIRE),
      b: pick(FIRE),
    };
    if (this.c.calm) this.explode({ ...r, y: r.top });
    else this.rockets.push(r);
  }

  private explode(r: Rocket) {
    const h = this.c.h();
    const n = this.c.calm ? 40 : 72;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = h * 0.42 * Math.sqrt(Math.random());
      this.sparks.push({
        x: r.x,
        y: r.y,
        px: r.x,
        py: r.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: rand(1, 1.6),
        age: 0,
        color: i % 3 === 0 ? r.b : r.a,
      });
    }
  }

  release() {
    this.held = false;
  }

  update(now: number, dt: number) {
    if (this.held && now >= this.next) {
      this.launch();
      this.next = now + (this.c.calm ? 700 : 380);
    }
    const h = this.c.h();
    for (const r of this.rockets) {
      r.vy += h * 0.9 * dt;
      r.y += r.vy * dt;
    }
    const done = this.rockets.filter((r) => r.y <= r.top || r.vy >= 0);
    done.forEach((r) => this.explode(r));
    this.rockets = this.rockets.filter((r) => !done.includes(r));
    const drag = Math.exp(-1.5 * dt);
    for (const s of this.sparks) {
      s.px = s.x;
      s.py = s.y;
      if (!this.c.calm) {
        s.vx *= drag;
        s.vy = s.vy * drag + h * 0.32 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      s.age += dt;
    }
    this.sparks = this.sparks.filter((s) => s.age < s.life);
    const busy = this.held || this.rockets.length > 0 || this.sparks.length > 0;
    if (!busy && this.quietSince === null) this.quietSince = now;
    return busy || (this.quietSince !== null && now - this.quietSince < 300);
  }

  dim(now: number) {
    const fadeIn = clamp01((now - this.start) / 300);
    const fadeOut = this.quietSince === null ? 1 : 1 - clamp01((now - this.quietSince) / 300);
    // 밝은 슬라이드 위에서도 불꽃이 보이도록 충분히 어둡게
    return 0.62 * fadeIn * fadeOut;
  }

  draw(g: CanvasRenderingContext2D, _w: number, h: number) {
    g.save();
    g.lineCap = 'round';
    for (const r of this.rockets) {
      g.strokeStyle = 'rgba(255, 230, 190, 0.9)';
      g.lineWidth = h * 0.007;
      g.beginPath();
      g.moveTo(r.x, r.y);
      g.lineTo(r.x, r.y + h * 0.05);
      g.stroke();
    }
    // 어둡게 깐 위에 그냥 칠한다. 더하기(lighter)는 밝은 슬라이드 위에서 색이 바래서 쓰지 않는다
    for (const s of this.sparks) {
      const k = 1 - s.age / s.life;
      g.globalAlpha = Math.min(1, k * 1.4);
      g.strokeStyle = s.color;
      g.lineWidth = h * 0.012 * (0.45 + k);
      g.beginPath();
      g.moveTo(s.px, s.py);
      g.lineTo(s.x + 0.01, s.y);
      g.stroke();
    }
    g.restore();
  }
}

// ---------- 마이크 드롭 ----------

class MicDrop implements Actor {
  readonly cue = 'micdrop';
  held = true;
  private start: number;
  private dust: Spark[] = [];
  private landed = false;

  constructor(private c: Ctx, now: number) {
    this.start = now;
  }

  release() {
    this.held = false;
  }

  /** 떨어지고, 두 번 튀고, 옆으로 눕는다. [중심 y 비율, 각도] */
  private pose(t: number, h: number, L: number): [number, number] {
    const floor = h * 0.84;
    const standing = floor - L * 0.5;
    if (this.c.calm) return [floor - L * 0.13, 1.42];
    if (t < 0.42) {
      const u = easeIn(t / 0.42);
      return [-L + (standing + L) * u, -0.25 + 0.35 * u];
    }
    const lying = floor - L * 0.13;
    if (t < 0.72) {
      const u = (t - 0.42) / 0.3;
      const bounce = Math.sin(Math.PI * u) * h * 0.07;
      const base = standing + (lying - standing) * easeOut(u);
      return [base - bounce, 0.1 + 1.32 * easeOut(u)];
    }
    if (t < 0.9) {
      const u = (t - 0.72) / 0.18;
      return [lying - Math.sin(Math.PI * u) * h * 0.018, 1.42];
    }
    return [lying, 1.42];
  }

  update(now: number, dt: number) {
    const t = (now - this.start) / 1000;
    if (!this.landed && (t >= 0.42 || this.c.calm)) {
      this.landed = true;
      if (!this.c.calm) this.puff();
    }
    const h = this.c.h();
    for (const s of this.dust) {
      s.vx *= Math.exp(-3 * dt);
      s.vy = s.vy * Math.exp(-3 * dt) - h * 0.02 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.age += dt;
    }
    this.dust = this.dust.filter((s) => s.age < s.life);
    return t < 3.1;
  }

  private puff() {
    const w = this.c.w();
    const h = this.c.h();
    for (let i = 0; i < 26; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.dust.push({
        x: w / 2 + side * rand(0, w * 0.04),
        y: h * 0.84,
        px: 0,
        py: 0,
        vx: side * h * rand(0.2, 0.7),
        vy: -h * rand(0.02, 0.18),
        life: rand(0.6, 1.1),
        age: 0,
        color: 'rgba(230, 222, 210, 0.5)',
      });
    }
  }

  dim(now: number) {
    const t = (now - this.start) / 1000;
    return 0.6 * clamp01((t - 0.5) / 0.7) * (1 - clamp01((t - 2.6) / 0.5));
  }

  flash(now: number) {
    const t = (now - this.start) / 1000;
    if (this.c.calm || t < 0.42) return 0;
    return 0.12 * (1 - clamp01((t - 0.42) / 0.25));
  }

  draw(g: CanvasRenderingContext2D, w: number, h: number, now: number) {
    const t = (now - this.start) / 1000;
    const L = h * 0.44;
    const [y, angle] = this.pose(t, h, L);
    const fade = 1 - clamp01((t - 2.6) / 0.5);
    const shake = !this.c.calm && t > 0.42 && t < 0.62 ? Math.sin(t * 90) * h * 0.006 * (1 - (t - 0.42) / 0.2) : 0;

    for (const s of this.dust) {
      g.globalAlpha = 0.55 * (1 - s.age / s.life) * fade;
      g.fillStyle = '#e6ded2';
      g.beginPath();
      g.arc(s.x, s.y, h * 0.012 * (1 + s.age * 2), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = fade;

    g.save();
    g.translate(w / 2 + shake, y);
    g.rotate(angle);
    const headR = L * 0.17;
    const neck = -L * 0.5 + headR * 1.7;
    // 손잡이: 위가 굵고 아래로 가늘어진다
    const handle = g.createLinearGradient(-L * 0.08, 0, L * 0.08, 0);
    handle.addColorStop(0, '#141211');
    handle.addColorStop(0.45, '#4a4744');
    handle.addColorStop(1, '#1a1817');
    g.fillStyle = handle;
    g.beginPath();
    g.moveTo(-L * 0.085, neck);
    g.lineTo(-L * 0.05, L * 0.5);
    g.quadraticCurveTo(0, L * 0.53, L * 0.05, L * 0.5);
    g.lineTo(L * 0.085, neck);
    g.closePath();
    g.fill();
    // 금색 고리
    g.fillStyle = '#c9a45c';
    g.fillRect(-L * 0.1, neck - L * 0.03, L * 0.2, L * 0.06);
    // 머리: 그물
    const headY = -L * 0.5 + headR;
    const grill = g.createRadialGradient(-headR * 0.35, headY - headR * 0.35, headR * 0.1, 0, headY, headR);
    grill.addColorStop(0, '#eef0f3');
    grill.addColorStop(1, '#8d9196');
    g.fillStyle = grill;
    g.beginPath();
    g.arc(0, headY, headR, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(40, 42, 46, 0.45)';
    g.lineWidth = headR * 0.06;
    for (let k = -1; k <= 1; k += 0.25) {
      g.beginPath();
      g.moveTo(-headR, headY + k * headR);
      g.lineTo(headR, headY + k * headR + headR * 0.5);
      g.stroke();
      g.beginPath();
      g.moveTo(-headR, headY + k * headR + headR * 0.5);
      g.lineTo(headR, headY + k * headR);
      g.stroke();
    }
    g.restore();
    g.restore();
    g.globalAlpha = 1;
  }
}

// ---------- 딩동댕 (O), 땡 (X) ----------

const MIN_MARK_MS = 900;

class Mark implements Actor {
  held = true;
  private start: number;
  private outAt: number | null = null;

  constructor(
    readonly cue: 'correct' | 'wrong',
    private c: Ctx,
    now: number,
  ) {
    this.start = now;
  }

  release(now: number) {
    if (!this.held) return;
    this.held = false;
    this.outAt = Math.max(now, this.start + MIN_MARK_MS);
  }

  update(now: number) {
    return this.outAt === null || now < this.outAt + 340;
  }

  dim(now: number) {
    const t = (now - this.start) / 1000;
    const out = this.outAt === null ? 0 : clamp01((now - this.outAt) / 300);
    return 0.28 * clamp01(t / 0.2) * (1 - out);
  }

  draw(g: CanvasRenderingContext2D, w: number, h: number, now: number) {
    const t = (now - this.start) / 1000;
    let scale = this.c.calm ? 1 : spring(t * 1.15);
    if (this.outAt !== null && now > this.outAt) scale *= shrink((now - this.outAt) / 320);
    if (scale <= 0.001) return;
    // 3D 처럼 보이게: 비스듬히 돌아 있다가 정면으로 선다
    const turn = this.c.calm ? 0 : (1 - easeOut(clamp01(t / 0.6))) * 1.15;
    const shake = this.cue === 'wrong' && !this.c.calm ? Math.sin(t * 42) * Math.exp(-t * 5) * w * 0.025 : 0;
    const R = h * 0.26;
    g.save();
    g.translate(w / 2 + shake, h / 2);
    g.scale(scale * Math.cos(turn), scale);
    g.lineCap = 'round';
    if (this.cue === 'correct') {
      const grad = g.createLinearGradient(-R, -R, R, R);
      grad.addColorStop(0, '#7fb2ff');
      grad.addColorStop(0.5, '#2f7bff');
      grad.addColorStop(1, '#1b55c4');
      g.strokeStyle = grad;
      g.lineWidth = R * 0.34;
      g.beginPath();
      g.arc(0, 0, R, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      g.lineWidth = R * 0.07;
      g.beginPath();
      g.arc(0, 0, R * 1.04, Math.PI * 1.08, Math.PI * 1.42);
      g.stroke();
    } else {
      const grad = g.createLinearGradient(-R, -R, R, R);
      grad.addColorStop(0, '#ff8a80');
      grad.addColorStop(0.5, '#ff3b30');
      grad.addColorStop(1, '#c8251c');
      g.strokeStyle = grad;
      g.lineWidth = R * 0.36;
      const k = R * 0.82;
      g.beginPath();
      g.moveTo(-k, -k);
      g.lineTo(k, k);
      g.moveTo(k, -k);
      g.lineTo(-k, k);
      g.stroke();
      g.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      g.lineWidth = R * 0.07;
      g.beginPath();
      g.moveTo(-k * 0.92, -k * 1.05);
      g.lineTo(-k * 0.45, -k * 0.58);
      g.stroke();
    }
    g.restore();
  }
}

// ---------- 무대 ----------

function makeActor(cue: Cue, c: Ctx, now: number): Actor {
  switch (cue) {
    case 'confetti':
      return new Confetti(c, now);
    case 'drumroll':
      return new Drum(c, now);
    case 'applause':
      return new Applause(now);
    case 'fireworks':
      return new Fireworks(c, now);
    case 'micdrop':
      return new MicDrop(c, now);
    case 'correct':
    case 'wrong':
      return new Mark(cue, c, now);
  }
}

/** 캔버스 하나에 효과를 그린다. 캔버스는 청중 화면을 꽉 채운다 */
export class CueStage {
  private g: CanvasRenderingContext2D;
  private actors: Actor[] = [];
  private raf = 0;
  private last = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  private shown: Cue | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private onActive?: (cue: Cue | null) => void,
  ) {
    this.g = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
  }

  private ctx(): Ctx {
    return { calm: this.calm.matches, w: () => this.w, h: () => this.h };
  }

  press(cue: Cue) {
    const now = performance.now();
    // 같은 효과를 누르고 있는 중이면 새로 만들지 않는다
    if (this.actors.some((a) => a.cue === cue && a.held)) return;
    this.actors.push(makeActor(cue, this.ctx(), now));
    this.announce(cue);
    this.start();
  }

  release(cue: Cue) {
    const now = performance.now();
    for (const a of this.actors) if (a.cue === cue && a.held) a.release(now);
  }

  releaseAll() {
    const now = performance.now();
    for (const a of this.actors) if (a.held) a.release(now);
  }

  isHeld(cue: Cue) {
    return this.actors.some((a) => a.cue === cue && a.held);
  }

  private announce(cue: Cue | null) {
    if (cue === this.shown) return;
    this.shown = cue;
    this.onActive?.(cue);
  }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.actors = this.actors.filter((a) => a.update(now, dt));

    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    const dim = this.actors.reduce((m, a) => Math.max(m, a.dim?.(now) ?? 0), 0);
    if (dim > 0) {
      g.fillStyle = `rgba(0, 0, 0, ${dim})`;
      g.fillRect(0, 0, this.w, this.h);
    }
    for (const a of this.actors) a.draw?.(g, this.w, this.h, now);
    const flash = this.actors.reduce((m, a) => Math.max(m, a.flash?.(now) ?? 0), 0);
    if (flash > 0) {
      g.fillStyle = `rgba(255, 255, 255, ${flash})`;
      g.fillRect(0, 0, this.w, this.h);
    }

    const latest = this.actors[this.actors.length - 1];
    this.announce(latest ? latest.cue : null);
    if (this.actors.length > 0) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.raf = 0;
      g.clearRect(0, 0, this.w, this.h);
    }
  };
}
