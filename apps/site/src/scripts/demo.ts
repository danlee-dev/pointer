// 첫 화면 데모. 폰 모형을 조작하면 청중 화면 모형에 그대로 나타난다.
// 실제 앱처럼: 패드를 누른 채 움직이면 도구가 나가고, 레이저는 매 프레임 보간해 따라가며 짧은 꼬리를 남긴다.
// 펜으로 그린 것은 장을 넘기면 지워진다. 타이머는 처음 넘길 때 시작한다.

import { CueStage, type Cue } from './cues';
import { holdButton, registerKeys } from './keys';

type Tool = 'laser' | 'spotlight' | 'magnify' | 'pen';
interface Point {
  x: number;
  y: number;
}
interface Stroke {
  color: string;
  pts: Point[];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function fitCanvas(c: HTMLCanvasElement) {
  const r = c.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  const g = c.getContext('2d')!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w: r.width, h: r.height };
}

function formatClock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function initDemo(root: HTMLElement) {
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const css = getComputedStyle(root);
  const color = (name: string) => css.getPropertyValue(name).trim();
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  const screen = q<HTMLElement>('[data-screen]');
  const pad = q<HTMLElement>('[data-pad]');
  const screenSlides = Array.from(screen.querySelectorAll<HTMLElement>(':scope > .slide'));
  const padSlides = Array.from(pad.querySelectorAll<HTMLElement>(':scope > .slide'));
  const thumb = q<HTMLElement>('[data-next-thumb]');
  const thumbSlides = Array.from(thumb.querySelectorAll<HTMLElement>('.slide'));
  const count = screenSlides.length;

  const inkCanvas = q<HTMLCanvasElement>('[data-ink]');
  const padInkCanvas = q<HTMLCanvasElement>('[data-pad-ink]');
  const laserCanvas = q<HTMLCanvasElement>('[data-laser]');
  const spot = q<HTMLElement>('[data-spot]');
  const lens = q<HTMLElement>('[data-lens]');
  const lensHost = q<HTMLElement>('[data-lens-host]');
  const finger = q<HTMLElement>('[data-finger]');
  const hint = q<HTMLElement>('[data-hint]');
  const pageEl = q<HTMLElement>('[data-page]');
  const clockEl = q<HTMLElement>('[data-clock]');
  const prevBtn = q<HTMLButtonElement>('[data-prev]');
  const nextBtn = q<HTMLButtonElement>('[data-next-btn]');
  const nextLabel = q<HTMLElement>('[data-next-label]');
  const pensRow = q<HTMLElement>('[data-pens]');
  const sound = q<HTMLElement>('[data-sound]');
  const soundText = q<HTMLElement>('[data-sound-text]');
  const sounds = JSON.parse(root.dataset.sounds ?? '{}') as Record<Cue, string>;
  const toolButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tool]'));
  const penButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-pen]'));
  const cueButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-cue]'));

  let index = 0;
  let tool: Tool = 'laser';
  let pen = color('--pen-red');
  const used = new Set<Tool>();
  let strokes: Stroke[] = [];
  let timerStart: number | null = null;

  // ---------- 캔버스 크기 ----------

  let ink = fitCanvas(inkCanvas);
  let padInk = fitCanvas(padInkCanvas);
  let laser = fitCanvas(laserCanvas);
  const resize = () => {
    ink = fitCanvas(inkCanvas);
    padInk = fitCanvas(padInkCanvas);
    laser = fitCanvas(laserCanvas);
    redrawInk();
    lensHost.style.width = `${screen.clientWidth}px`;
  };
  new ResizeObserver(resize).observe(screen);
  new ResizeObserver(() => {
    padInk = fitCanvas(padInkCanvas);
    redrawInk();
  }).observe(pad);
  lensHost.style.width = `${screen.clientWidth}px`;

  // ---------- 장 넘기기 ----------

  function show(i: number) {
    index = Math.max(0, Math.min(count - 1, i));
    screenSlides.forEach((s, k) => (s.hidden = k !== index));
    padSlides.forEach((s, k) => (s.hidden = k !== index));
    const last = index === count - 1;
    thumb.hidden = last;
    thumbSlides.forEach((s, k) => (s.hidden = k !== index + 1));
    nextLabel.textContent = last ? (root.dataset.last ?? '') : (root.dataset.next ?? '');
    nextBtn.classList.toggle('last', last);
    nextBtn.disabled = last;
    prevBtn.disabled = index === 0;
    pageEl.textContent = String(index + 1);
    // 장을 넘기면 판서는 지워진다 (실제 앱과 같다)
    strokes = [];
    redrawInk();
    if (!lens.hidden) fillLens();
  }

  function nav(dir: 1 | -1) {
    const before = index;
    show(index + dir);
    if (index !== before && timerStart === null) startTimer();
    if (navigator.vibrate && matchMedia('(pointer: coarse)').matches) navigator.vibrate(8);
  }
  prevBtn.addEventListener('click', () => nav(-1));
  nextBtn.addEventListener('click', () => nav(1));

  function startTimer() {
    timerStart = performance.now();
    clockEl.classList.add('on');
    window.setInterval(() => {
      clockEl.textContent = formatClock(performance.now() - timerStart!);
    }, 1000);
  }

  // ---------- 도구 ----------

  function setTool(next: Tool) {
    tool = next;
    toolButtons.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tool === next)));
    pensRow.hidden = next !== 'pen';
    const btn = toolButtons.find((b) => b.dataset.tool === next);
    hint.textContent = btn?.dataset.hint ?? '';
    hint.classList.toggle('used', used.has(next));
  }
  toolButtons.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool as Tool)));

  penButtons.forEach((b) =>
    b.addEventListener('click', () => {
      pen = color(`--pen-${b.dataset.pen}`);
      penButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      finger.style.setProperty('--pen', pen);
    }),
  );
  q<HTMLButtonElement>('[data-clear]').addEventListener('click', () => {
    strokes = [];
    redrawInk();
  });

  // ---------- 판서 ----------

  function drawStroke(g: CanvasRenderingContext2D, w: number, h: number, s: Stroke, from = 0) {
    if (s.pts.length === 0) return;
    g.strokeStyle = s.color;
    g.fillStyle = s.color;
    g.lineWidth = Math.max(1.5, w * 0.0065);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (s.pts.length === 1) {
      const p = s.pts[0]!;
      g.beginPath();
      g.arc(p.x * w, p.y * h, g.lineWidth / 2, 0, Math.PI * 2);
      g.fill();
      return;
    }
    g.beginPath();
    const start = Math.max(0, from - 1);
    g.moveTo(s.pts[start]!.x * w, s.pts[start]!.y * h);
    for (let i = start + 1; i < s.pts.length; i++) g.lineTo(s.pts[i]!.x * w, s.pts[i]!.y * h);
    g.stroke();
  }

  function redrawInk() {
    ink.g.clearRect(0, 0, ink.w, ink.h);
    padInk.g.clearRect(0, 0, padInk.w, padInk.h);
    for (const s of strokes) {
      drawStroke(ink.g, ink.w, ink.h, s);
      drawStroke(padInk.g, padInk.w, padInk.h, s);
    }
  }

  // ---------- 돋보기 ----------

  const ZOOM = 2;
  function fillLens() {
    lensHost.replaceChildren();
    const copy = screenSlides[index]!.cloneNode(true) as HTMLElement;
    copy.hidden = false;
    lensHost.append(copy);
  }
  function placeLens(p: Point) {
    const w = screen.clientWidth;
    const h = screen.clientHeight;
    const d = Math.round(w * 0.27);
    const x = p.x * w;
    const y = p.y * h;
    lens.style.setProperty('--d', `${d}px`);
    lens.style.transform = `translate(${x}px, ${y}px)`;
    lensHost.style.transform = `translate(${d / 2 - x * ZOOM}px, ${d / 2 - y * ZOOM}px) scale(${ZOOM})`;
  }

  // ---------- 레이저 (보간 + 꼬리) ----------

  let laserOn = false;
  let laserAlpha = 0;
  const target: Point = { x: 0.5, y: 0.5 };
  const pos: Point = { x: 0.5, y: 0.5 };
  let trail: Point[] = [];
  let raf = 0;
  let last = 0;

  function laserFrame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = calm.matches ? 1 : 1 - Math.exp(-dt * 26);
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    laserAlpha = laserOn ? 1 : Math.max(0, laserAlpha - dt * 5);
    trail.push({ ...pos });
    if (trail.length > 9) trail.shift();

    const { g, w, h } = laser;
    g.clearRect(0, 0, w, h);
    if (laserAlpha > 0) {
      const r = Math.max(5, w * 0.013);
      if (!calm.matches) {
        g.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1]!;
          const b = trail[i]!;
          const f = i / trail.length;
          g.strokeStyle = `rgba(255, 59, 48, ${0.35 * f * laserAlpha})`;
          g.lineWidth = r * 1.1 * f;
          g.beginPath();
          g.moveTo(a.x * w, a.y * h);
          g.lineTo(b.x * w, b.y * h);
          g.stroke();
        }
      }
      const x = pos.x * w;
      const y = pos.y * h;
      const glow = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
      glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
      glow.addColorStop(0.16, 'rgba(255, 138, 128, 1)');
      glow.addColorStop(0.36, 'rgba(255, 59, 48, 0.95)');
      glow.addColorStop(0.62, 'rgba(255, 59, 48, 0.22)');
      glow.addColorStop(1, 'rgba(255, 59, 48, 0)');
      g.globalAlpha = laserAlpha;
      g.fillStyle = glow;
      g.beginPath();
      g.arc(x, y, r * 2.4, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    if (laserOn || laserAlpha > 0) raf = requestAnimationFrame(laserFrame);
    else {
      raf = 0;
      trail = [];
    }
  }
  function runLaser() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(laserFrame);
  }

  // ---------- 패드 ----------

  let pressing: number | null = null;
  const norm = (e: PointerEvent): Point => {
    const r = pad.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  };
  const placeFinger = (p: Point) => {
    finger.style.transform = `translate(${p.x * pad.clientWidth}px, ${p.y * pad.clientHeight}px)`;
  };

  function begin(p: Point) {
    finger.className = `r-finger ${tool}`;
    finger.hidden = false;
    placeFinger(p);
    used.add(tool);
    hint.classList.add('used');
    pad.classList.add('pressing');
    if (tool === 'laser') {
      laserOn = true;
      target.x = pos.x = p.x;
      target.y = pos.y = p.y;
      trail = [];
      runLaser();
    } else if (tool === 'spotlight') {
      spot.hidden = false;
      spot.style.setProperty('--r', `${Math.round(screen.clientWidth * 0.12)}px`);
    } else if (tool === 'magnify') {
      fillLens();
      lens.hidden = false;
    } else {
      strokes.push({ color: pen, pts: [p] });
      redrawInk();
    }
    move(p);
  }

  function move(p: Point) {
    placeFinger(p);
    if (tool === 'laser') {
      target.x = p.x;
      target.y = p.y;
    } else if (tool === 'spotlight') {
      spot.style.setProperty('--x', `${p.x * 100}%`);
      spot.style.setProperty('--y', `${p.y * 100}%`);
    } else if (tool === 'magnify') {
      placeLens(p);
    } else {
      const s = strokes[strokes.length - 1];
      if (!s) return;
      const prev = s.pts[s.pts.length - 1]!;
      if (Math.hypot(prev.x - p.x, prev.y - p.y) < 0.002) return;
      s.pts.push(p);
      drawStroke(ink.g, ink.w, ink.h, s, s.pts.length - 1);
      drawStroke(padInk.g, padInk.w, padInk.h, s, s.pts.length - 1);
    }
  }

  function end() {
    pressing = null;
    pad.classList.remove('pressing');
    finger.hidden = true;
    laserOn = false;
    spot.hidden = true;
    lens.hidden = true;
  }

  pad.addEventListener('pointerdown', (e) => {
    if (pressing !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    pressing = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    e.preventDefault();
    begin(norm(e));
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pressing) return;
    for (const ev of e.getCoalescedEvents?.() ?? [e]) move(norm(ev));
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    pad.addEventListener(type, (e) => e.pointerId === pressing && end());
  }

  // ---------- 효과 ----------

  const stage = new CueStage(q<HTMLCanvasElement>('[data-cues]'), (cue) => {
    sound.hidden = cue === null;
    if (cue) soundText.textContent = sounds[cue] ?? '';
  });
  const press = (cue: Cue) => {
    stage.press(cue);
    cueButtons.forEach((b) => b.dataset.cue === cue && b.classList.add('on'));
  };
  const release = (cue: Cue) => {
    stage.release(cue);
    cueButtons.forEach((b) => b.dataset.cue === cue && b.classList.remove('on'));
  };
  cueButtons.forEach((b) => {
    const cue = b.dataset.cue as Cue;
    holdButton(b, () => press(cue), () => release(cue));
  });

  registerKeys(root, { nav, press, release });
  show(0);
}
