// 효과 판: 키캡 버튼을 꾹 누르거나, 판이 화면에 보일 때 키보드 C D A R M O X 를 누르고 있으면 효과가 이어진다.

import { CueStage, type Cue } from './cues';
import { holdButton, registerKeys } from './keys';

export function initBoard(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-cues]')!;
  const sound = root.querySelector<HTMLElement>('[data-sound]')!;
  const soundText = root.querySelector<HTMLElement>('[data-sound-text]')!;
  const sounds = JSON.parse(root.dataset.sounds ?? '{}') as Record<Cue, string>;
  const keys = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-cue]'));

  const stage = new CueStage(canvas, (cue) => {
    sound.hidden = cue === null;
    if (cue) soundText.textContent = sounds[cue] ?? '';
  });
  const mark = (cue: Cue, on: boolean) => keys.forEach((k) => k.dataset.cue === cue && k.classList.toggle('on', on));
  const press = (cue: Cue) => {
    stage.press(cue);
    mark(cue, true);
  };
  const release = (cue: Cue) => {
    stage.release(cue);
    mark(cue, false);
  };

  keys.forEach((k) => {
    const cue = k.dataset.cue as Cue;
    holdButton(k, () => press(cue), () => release(cue));
  });
  registerKeys(root, { press, release });
}
