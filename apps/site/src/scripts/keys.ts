// 데스크톱 앱과 같은 키를 페이지에서도 받는다: C D A R M O X 는 효과 (누르고 있는 동안), 좌우 화살표는 넘기기.
// 키는 지금 화면에 가장 많이 보이는 데모 하나에만 간다. 아무 데모도 안 보이면 키를 건드리지 않는다.

import { CUE_KEYS, type Cue } from './cues';

export interface KeyTarget {
  nav?(dir: 1 | -1): void;
  press(cue: Cue): void;
  release(cue: Cue): void;
}

interface Entry extends KeyTarget {
  el: Element;
  ratio: number;
}

const entries: Entry[] = [];
const held = new Map<string, { target: Entry; cue: Cue }>();
let io: IntersectionObserver | null = null;

function active(): Entry | null {
  let best: Entry | null = null;
  for (const e of entries) if (e.ratio > 0.25 && (!best || e.ratio > best.ratio)) best = e;
  return best;
}

function typing(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}

function releaseAll() {
  for (const { target, cue } of held.values()) target.release(cue);
  held.clear();
}

function install() {
  io = new IntersectionObserver(
    (list) => {
      for (const item of list) {
        const e = entries.find((x) => x.el === item.target);
        if (e) e.ratio = item.isIntersecting ? item.intersectionRatio : 0;
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );

  window.addEventListener('keydown', (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey || typing(ev.target)) return;
    const key = ev.key.toLowerCase();
    const cue = CUE_KEYS[key];
    if (cue) {
      if (ev.repeat || held.has(key)) return;
      const target = active();
      if (!target) return;
      target.press(cue);
      held.set(key, { target, cue });
      return;
    }
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      const target = active();
      if (!target?.nav || target.ratio < 0.5) return;
      ev.preventDefault();
      target.nav(ev.key === 'ArrowRight' ? 1 : -1);
    }
  });
  window.addEventListener('keyup', (ev) => {
    const key = ev.key.toLowerCase();
    const h = held.get(key);
    if (!h) return;
    h.target.release(h.cue);
    held.delete(key);
  });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => document.hidden && releaseAll());
}

export function registerKeys(el: Element, target: KeyTarget) {
  if (!io) install();
  entries.push({ el, ratio: 0, ...target });
  io!.observe(el);
}

/** 꾹 누르는 버튼: 누르는 동안 press, 떼면 release. 손가락·마우스·키보드(Space, Enter) 모두 */
export function holdButton(btn: HTMLElement, onPress: () => void, onRelease: () => void) {
  let down = false;
  const start = () => {
    if (down) return;
    down = true;
    onPress();
  };
  const end = () => {
    if (!down) return;
    down = false;
    onRelease();
  };
  btn.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    btn.setPointerCapture(e.pointerId);
    e.preventDefault();
    start();
  });
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('lostpointercapture', end);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      start();
    }
  });
  btn.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') end();
  });
  btn.addEventListener('blur', end);
}
