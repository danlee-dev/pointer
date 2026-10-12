// 효과음. 소리 파일 없이 Web Audio 로 그 자리에서 합성한다.
// 저작권 걱정이 없고, 누르고 있는 만큼 이어 붙이기 쉽다 (두구두구, 박수).
// 시간 인자 delay 는 "지금부터 몇 초 뒤" 다. 애니메이션이 정한 순간(막대가 북에 닿는 때 등)에 맞춘다.

/** 마이크가 바닥에 닿는 순간들 (떨어뜨린 뒤 초). 3D 애니메이션도 이 값으로 튄다 */
export const MIC_IMPACTS = [0.55, 0.93, 1.13] as const;
const MIC_IMPACT_VEL = [1, 0.42, 0.18] as const;

type Ctx = BaseAudioContext;

export function makeNoise(ctx: Ctx, seconds = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 순간 소리의 크기 모양: attack 동안 올라갔다가 decay 동안 지수로 줄어든다 */
function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noiseAt(ctx: Ctx, noise: AudioBuffer, t: number, dur: number) {
  const s = ctx.createBufferSource();
  s.buffer = noise;
  // 같은 구간을 매번 쓰면 기계처럼 들리니 시작 위치를 흔든다
  s.start(t, Math.random() * Math.max(0, noise.duration - dur - 0.01), dur);
  return s;
}

function filter(ctx: Ctx, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function tone(ctx: Ctx, out: AudioNode, t: number, type: OscillatorType, from: number, to: number, glide: number, peak: number, attack: number, decay: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t + glide);
  const g = ctx.createGain();
  env(g, t, peak, attack, decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

// ---------- 소리 하나하나 ----------

/** 북 한 번: 낮은 울림(몸통) + 부드러운 막대 소리. 북은 처음에 살짝 높았다가 제 음으로 내려앉는다 */
export function tom(ctx: Ctx, out: AudioNode, noise: AudioBuffer, t: number, f: number, v: number, decay = 0.32) {
  tone(ctx, out, t, 'sine', f * 1.5, f, 0.05, v * 0.9, 0.004, decay);
  tone(ctx, out, t, 'sine', f * 2.4, f * 1.6, 0.05, v * 0.22, 0.003, decay * 0.4);
  const g = ctx.createGain();
  env(g, t, v * 0.18, 0.002, 0.04);
  noiseAt(ctx, noise, t, 0.08).connect(filter(ctx, 'lowpass', 1400)).connect(g).connect(out);
}

export function kick(ctx: Ctx, out: AudioNode, t: number, v: number) {
  tone(ctx, out, t, 'sine', 150, 42, 0.3, v, 0.002, 0.45);
}

/** 부드러운 심벌 '짠'. 귀가 아프지 않게 아주 높은 쇳소리는 뺐다 */
export function crash(ctx: Ctx, out: AudioNode, noise: AudioBuffer, t: number, v: number) {
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, t);
  bus.gain.exponentialRampToValueAtTime(v, t + 0.006);
  bus.gain.exponentialRampToValueAtTime(v * 0.3, t + 0.3);
  bus.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  bus.connect(out);
  const wash = ctx.createGain();
  wash.gain.value = 0.3;
  noiseAt(ctx, noise, t, 1.9).connect(filter(ctx, 'bandpass', 4200, 0.5)).connect(filter(ctx, 'lowpass', 6500)).connect(wash).connect(bus);
  const body = ctx.createGain();
  body.gain.value = 0.22;
  noiseAt(ctx, noise, t, 1.9).connect(filter(ctx, 'bandpass', 1800, 0.9)).connect(body).connect(bus);
}

/** 꽃가루 대포: 펑 + 종이 흩날리는 소리 */
export function pop(ctx: Ctx, out: AudioNode, noise: AudioBuffer, t: number, v: number) {
  const lp = filter(ctx, 'lowpass', 5000);
  lp.frequency.setValueAtTime(5000, t);
  lp.frequency.exponentialRampToValueAtTime(600, t + 0.1);
  const g = ctx.createGain();
  env(g, t, v * 0.9, 0.002, 0.12);
  noiseAt(ctx, noise, t, 0.2).connect(lp).connect(g).connect(out);
  tone(ctx, out, t, 'sine', 170, 55, 0.12, v * 0.6, 0.002, 0.15);
  const paper = ctx.createGain();
  paper.gain.setValueAtTime(0.0001, t);
  paper.gain.exponentialRampToValueAtTime(v * 0.045, t + 0.06);
  paper.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  noiseAt(ctx, noise, t, 1.25).connect(filter(ctx, 'bandpass', 3000, 0.7)).connect(paper).connect(out);
}

/** 불꽃 하나: 올라가는 휘파람 소리, flight 초 뒤 펑, 이어서 타닥타닥 */
export function rocket(ctx: Ctx, out: AudioNode, noise: AudioBuffer, t: number, flight: number, v: number) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(rand(420, 520), t);
  o.frequency.linearRampToValueAtTime(rand(1100, 1350), t + flight * 0.92);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 22;
  const depth = ctx.createGain();
  depth.gain.value = 18;
  lfo.connect(depth).connect(o.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v * 0.025, t + 0.06);
  g.gain.setValueAtTime(v * 0.025, t + flight * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + flight);
  o.connect(g).connect(out);
  o.start(t);
  lfo.start(t);
  o.stop(t + flight + 0.05);
  lfo.stop(t + flight + 0.05);
  const hiss = ctx.createGain();
  env(hiss, t, v * 0.03, 0.05, flight);
  noiseAt(ctx, noise, t, flight + 0.1).connect(filter(ctx, 'bandpass', 2200, 0.6)).connect(hiss).connect(out);
  boom(ctx, out, noise, t + flight, v);
}

export function boom(ctx: Ctx, out: AudioNode, noise: AudioBuffer, t: number, v: number) {
  const lp = filter(ctx, 'lowpass', 1200);
  lp.frequency.setValueAtTime(1200, t);
  lp.frequency.exponentialRampToValueAtTime(260, t + 0.45);
  const g = ctx.createGain();
  env(g, t, v * 0.9, 0.004, 1.5);
  noiseAt(ctx, noise, t, 1.6).connect(lp).connect(g).connect(out);
  tone(ctx, out, t, 'sine', 78, 34, 0.7, v * 0.75, 0.003, 0.9);
  for (let i = 0; i < 26; i++) {
    const tt = t + rand(0.25, 1.5);
    const c = ctx.createGain();
    env(c, tt, v * rand(0.03, 0.12), 0.001, 0.02);
    noiseAt(ctx, noise, tt, 0.03).connect(filter(ctx, 'bandpass', 1800, 0.8)).connect(c).connect(out);
  }
}

export function clap(ctx: Ctx, out: AudioNode, noise: AudioBuffer, t: number, v: number) {
  const g = ctx.createGain();
  env(g, t, v, 0.0015, rand(0.035, 0.07));
  noiseAt(ctx, noise, t, 0.1).connect(filter(ctx, 'bandpass', rand(900, 2400), rand(0.8, 1.6))).connect(g).connect(out);
}

/** 실로폰 같은 종소리 한 음 */
function chime(ctx: Ctx, out: AudioNode, t: number, f: number, v: number, dur: number) {
  tone(ctx, out, t, 'sine', f, f, 0, v, 0.004, dur);
  tone(ctx, out, t, 'sine', f * 2, f * 2, 0, v * 0.12, 0.003, dur * 0.35);
}

/** 딩동댕 */
export function correct(ctx: Ctx, out: AudioNode, t: number) {
  chime(ctx, out, t, 523.25, 0.42, 0.55);
  chime(ctx, out, t + 0.17, 659.25, 0.42, 0.55);
  chime(ctx, out, t + 0.34, 783.99, 0.48, 1.3);
}

/** 땡: 낮게 '뿌-뿌'. 부저처럼 찢어지는 소리 대신 둥근 소리 */
export function wrong(ctx: Ctx, out: AudioNode, t: number) {
  const lp = filter(ctx, 'lowpass', 900);
  lp.connect(out);
  for (const [at, f, len] of [
    [0, 233.1, 0.16],
    [0.2, 174.6, 0.42],
  ] as const) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + at);
    g.gain.exponentialRampToValueAtTime(0.2, t + at + 0.015);
    g.gain.setValueAtTime(0.17, t + at + len - 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + len);
    g.connect(lp);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    o.connect(g);
    o.start(t + at);
    o.stop(t + at + len + 0.02);
  }
}

/** 마이크가 바닥에 쿵. 처음 닿을 땐 스피커로 증폭된 낮은 울림이 같이 난다 */
export function thud(ctx: Ctx, out: AudioNode, noise: AudioBuffer, t: number, v: number, first: boolean) {
  const g = ctx.createGain();
  env(g, t, v * 0.7, 0.002, 0.22);
  noiseAt(ctx, noise, t, 0.3).connect(filter(ctx, 'lowpass', 380)).connect(g).connect(out);
  tone(ctx, out, t, 'sine', 95, 38, 0.35, v, 0.002, 0.5);
  if (first) tone(ctx, out, t, 'sine', 58, 50, 1, v * 0.5, 0.01, 1.2);
}

// ---------- 누르고 있는 동안 이어지는 소리 ----------
// 25ms 마다 깨어나 0.12초 앞까지 미리 예약한다 (Web Audio 표준 예약 방식). 타이머가 조금 늦어도 박자가 안 흔들린다.

const LOOKAHEAD = 0.12;

class Roll {
  private next: number;
  private start: number;
  private endAt: number | null = null;
  private i = 0;
  private timer: ReturnType<typeof setInterval>;

  constructor(
    private ctx: Ctx,
    private out: AudioNode,
    private noise: AudioBuffer,
  ) {
    this.start = this.next = ctx.currentTime + 0.02;
    this.timer = setInterval(this.pump, 25);
    this.pump();
  }

  private pump = () => {
    const until = this.ctx.currentTime + LOOKAHEAD;
    while (this.next < until && (this.endAt === null || this.next < this.endAt - 0.04)) {
      const age = this.next - this.start;
      // 3초에 걸쳐 점점 커지고 빨라진다. 낮은 북(두)과 조금 높은 북(구)을 번갈아 친다.
      const level = Math.min(1, 0.35 + (age / 3) * 0.65);
      const du = this.i % 2 === 0;
      tom(this.ctx, this.out, this.noise, this.next, du ? 98 : 131, level * (du ? 1 : 0.85) * rand(0.9, 1), 0.28);
      this.next += 1 / (11 + Math.min(5, age * 1.6)) + rand(-0.004, 0.004);
      this.i++;
    }
    if (this.endAt !== null && this.next >= this.endAt - 0.04) clearInterval(this.timer);
  };

  finish(delay: number) {
    if (this.endAt !== null) return;
    const t = this.ctx.currentTime + delay;
    this.endAt = t;
    // 둥! + 짠
    tom(this.ctx, this.out, this.noise, t, 73, 1.1, 0.9);
    kick(this.ctx, this.out, t, 0.8);
    crash(this.ctx, this.out, this.noise, t + 0.01, 1.1);
  }

  stop() {
    clearInterval(this.timer);
  }
}

class Applause {
  private bus: GainNode;
  private bed: AudioBufferSourceNode;
  private clappers: { next: number; period: number; v: number }[];
  private endAt: number | null = null;
  private timer: ReturnType<typeof setInterval>;

  constructor(
    private ctx: Ctx,
    out: AudioNode,
    private noise: AudioBuffer,
  ) {
    const now = ctx.currentTime;
    this.bus = ctx.createGain();
    // 사람들이 하나둘 박수에 합류하듯 0.9초에 걸쳐 커진다
    this.bus.gain.setValueAtTime(0.0001, now);
    this.bus.gain.exponentialRampToValueAtTime(0.32, now + 0.9);
    this.bus.connect(out);
    this.bed = ctx.createBufferSource();
    this.bed.buffer = noise;
    this.bed.loop = true;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.12;
    this.bed.connect(filter(ctx, 'bandpass', 1600, 0.4)).connect(bedGain).connect(this.bus);
    this.bed.start(now);
    this.clappers = Array.from({ length: 36 }, () => ({ next: now + rand(0, 0.45), period: 1 / rand(3.2, 5), v: rand(0.35, 1) }));
    this.timer = setInterval(this.pump, 25);
    this.pump();
  }

  private pump = () => {
    const until = this.ctx.currentTime + LOOKAHEAD;
    for (const c of this.clappers) {
      while (c.next < until && (this.endAt === null || c.next < this.endAt)) {
        clap(this.ctx, this.bus, this.noise, c.next, c.v * rand(0.6, 1));
        c.next += c.period * rand(0.92, 1.08);
      }
    }
    if (this.endAt !== null && this.ctx.currentTime > this.endAt) this.stop();
  };

  /** delay 초 뒤부터 fade 초에 걸쳐 잦아든다 */
  finish(delay: number, fade = 2) {
    if (this.endAt !== null) return;
    const t = this.ctx.currentTime + delay;
    this.endAt = t + fade;
    this.bus.gain.cancelAndHoldAtTime(t);
    this.bus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  }

  stop() {
    clearInterval(this.timer);
    try {
      this.bed.stop();
    } catch {
      // 이미 멈춤
    }
  }
}

// ---------- 마지막 단 ----------
// 노트북·프로젝터 스피커에서 귀가 아프지 않게: 높은 소리를 깎고, 전체를 낮추고, 겹쳐도 안 찢어지게 눌러 준다.

export function buildMaster(ctx: Ctx, dest: AudioNode): AudioNode {
  const master = ctx.createGain();
  master.gain.value = 0.55;
  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 3200;
  shelf.gain.value = -9;
  const lp = filter(ctx, 'lowpass', 8000);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 5;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;
  master.connect(shelf).connect(lp).connect(comp).connect(dest);
  return master;
}

// ---------- 창 하나에 하나 ----------

export interface Hold {
  finish(delay: number): void;
  stop(): void;
}

export class CueSound {
  private ctx: AudioContext | null = null;
  private out!: AudioNode;
  private noise!: AudioBuffer;
  private holds = new Set<Hold>();

  private get c(): AudioContext {
    if (!this.ctx) {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      const master = buildMaster(ctx, ctx.destination);
      this.out = master;
      this.noise = makeNoise(ctx, 2);
      this.ctx = ctx;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  drumroll(): Hold {
    return this.track(new Roll(this.c, this.out, this.noise));
  }

  applause(): Hold {
    return this.track(new Applause(this.c, this.out, this.noise));
  }

  pop(v = 1) {
    const ctx = this.c;
    pop(ctx, this.out, this.noise, ctx.currentTime + 0.005, v);
  }

  rocket(flight: number, v = 1) {
    const ctx = this.c;
    rocket(ctx, this.out, this.noise, ctx.currentTime + 0.005, flight, v);
  }

  micdrop() {
    const ctx = this.c;
    const t = ctx.currentTime;
    MIC_IMPACTS.forEach((at, i) => thud(ctx, this.out, this.noise, t + at, MIC_IMPACT_VEL[i]!, i === 0));
  }

  correct() {
    const ctx = this.c;
    correct(ctx, this.out, ctx.currentTime + 0.01);
  }

  wrong(delay = 0) {
    const ctx = this.c;
    wrong(ctx, this.out, ctx.currentTime + delay);
  }

  /** 창이 닫힐 때 */
  close() {
    for (const h of this.holds) h.stop();
    this.holds.clear();
    void this.ctx?.close();
    this.ctx = null;
  }

  private track(h: Hold): Hold {
    this.holds.add(h);
    return {
      finish: (delay) => h.finish(delay),
      stop: () => {
        h.stop();
        this.holds.delete(h);
      },
    };
  }
}
