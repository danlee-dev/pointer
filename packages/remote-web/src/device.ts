// 이 폰을 데스크톱에 소개하는 정보, 진동, 화면 꺼짐 방지.

import type { DeviceInfo } from '@pointer/protocol';

function store(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** http 주소에서는 crypto.randomUUID 가 없다 (secure context 전용). getRandomValues 는 된다 */
function randomId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function deviceInfo(): DeviceInfo {
  const id = store('pointer.deviceId') ?? store('pointer.deviceId', randomId()) ?? randomId();
  const ua = navigator.userAgent;
  const browser = /SamsungBrowser/.test(ua)
    ? 'Samsung Internet'
    : /Firefox/.test(ua)
      ? 'Firefox'
      : /EdgA|Edg\//.test(ua)
        ? 'Edge'
        : /Chrome/.test(ua)
          ? 'Chrome'
          : /Safari/.test(ua)
            ? 'Safari'
            : 'Browser';
  return { id, name: browser, platform: /Android/.test(ua) ? 'android' : 'web' };
}

// ---------- 진동 ----------
// 안드로이드 Chrome 은 되고, iPhone Safari 는 navigator.vibrate 자체가 없다.

export const haptics = {
  get enabled() {
    return store('pointer.haptics') !== 'off';
  },
  set enabled(on: boolean) {
    store('pointer.haptics', on ? 'on' : 'off');
  },
  get supported() {
    return typeof navigator.vibrate === 'function';
  },
  tick() {
    if (this.enabled && this.supported) navigator.vibrate(12);
  },
  alert() {
    if (this.enabled && this.supported) navigator.vibrate([180, 90, 180]);
  },
};

// ---------- 화면 꺼짐 방지 ----------
// Wake Lock API 는 https 에서만 된다. 같은 와이파이의 http 주소에서는
// 소리 없는 짧은 영상을 반복 재생해서 화면이 꺼지지 않게 한다 (첫 터치 이후에만 재생 가능).

let video: HTMLVideoElement | null = null;

export async function keepAwake() {
  try {
    if ('wakeLock' in navigator && window.isSecureContext) {
      await navigator.wakeLock.request('screen');
      return;
    }
  } catch {
    // 아래 영상 방식으로
  }
  if (!video) {
    video = document.createElement('video');
    video.src = '/keepawake.mp4';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0.01', pointerEvents: 'none', bottom: '0' });
    document.body.appendChild(video);
  }
  await video.play().catch(() => {});
}
