import { describe, expect, it } from 'vitest';
import { EMPTY_SESSION, reduce, type Session } from './session';
import type { DeckInfo } from '@pointer/protocol';

const deck: DeckInfo = {
  id: 'd1',
  title: 't',
  kind: 'pdf',
  pages: [{ w: 16, h: 9 }, { w: 16, h: 9 }, { w: 16, h: 9 }],
};
const open = (): Session => reduce(EMPTY_SESSION, { t: 'openDeck', deck }, 0);

describe('reduce', () => {
  it('넘기기는 처음과 끝에서 멈춘다', () => {
    let s = open();
    s = reduce(s, { t: 'nav', dir: -1 }, 0);
    expect(s.index).toBe(0);
    for (let i = 0; i < 5; i++) s = reduce(s, { t: 'nav', dir: 1 }, 0);
    expect(s.index).toBe(2);
  });

  it('가린 상태에서 넘기면 장은 그대로, 화면만 켜진다', () => {
    let s = reduce(open(), { t: 'blank', blank: 'black' }, 0);
    s = reduce(s, { t: 'nav', dir: 1 }, 0);
    expect(s).toMatchObject({ index: 0, blank: 'none' });
  });

  it('타이머는 처음 넘길 때만 자동 시작한다', () => {
    let s = reduce(open(), { t: 'nav', dir: 1 }, 1000);
    expect(s.timer).toMatchObject({ running: true, startedAt: 1000 });
    s = reduce(s, { t: 'timer', action: 'pause' }, 4000);
    expect(s.timer).toMatchObject({ running: false, elapsedMs: 3000 });
    s = reduce(s, { t: 'nav', dir: 1 }, 9000);
    expect(s.timer.running).toBe(false);
  });

  it('첫 장에서 이전을 눌러도 타이머는 안 켜진다', () => {
    const s = reduce(open(), { t: 'nav', dir: -1 }, 1000);
    expect(s.timer.running).toBe(false);
  });

  it('goto 는 범위를 벗어나면 끝으로 맞춘다', () => {
    const s = reduce(open(), { t: 'goto', index: 99 }, 0);
    expect(s.index).toBe(2);
  });

  it('자료가 없으면 넘기기를 무시한다', () => {
    const s = reduce(EMPTY_SESSION, { t: 'nav', dir: 1 }, 0);
    expect(s).toBe(EMPTY_SESSION);
  });

  it('리셋해도 목표 시간은 남는다', () => {
    let s = reduce(open(), { t: 'timerTarget', ms: 600_000 }, 0);
    s = reduce(s, { t: 'timer', action: 'start' }, 0);
    s = reduce(s, { t: 'timer', action: 'reset' }, 5000);
    expect(s.timer).toMatchObject({ running: false, elapsedMs: 0, targetMs: 600_000 });
  });

  it('발표를 끝내면 가림도 풀린다', () => {
    let s = reduce(open(), { t: 'presenting', on: true }, 0);
    s = reduce(s, { t: 'blank', blank: 'white' }, 0);
    s = reduce(s, { t: 'presenting', on: false }, 0);
    expect(s.blank).toBe('none');
  });
});
