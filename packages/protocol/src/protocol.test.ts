import { describe, expect, it } from 'vitest';
import { crossedAlerts, formatClock, parseClientMessage, parsePairingUrl, pairingUrl, timerElapsed } from './index';

const parse = (v: unknown) => parseClientMessage(JSON.stringify(v));

describe('parseClientMessage', () => {
  it('정상 메시지는 통과한다', () => {
    expect(parse({ t: 'nav', dir: 1 })).toEqual({ t: 'nav', dir: 1 });
    expect(parse({ t: 'pointer', tool: 'laser', on: true, x: 0.5, y: 1 })).toMatchObject({ x: 0.5 });
    expect(parse({ t: 'stroke', id: 'a', color: 'red', pts: [0, 0, 1, 1], end: false })).not.toBeNull();
    expect(parse({ t: 'cue', cue: 'drumroll', on: true })).toEqual({ t: 'cue', cue: 'drumroll', on: true });
  });

  it('모양이 틀리면 버린다', () => {
    expect(parseClientMessage('not json')).toBeNull();
    expect(parse({ t: 'nav', dir: 2 })).toBeNull();
    expect(parse({ t: 'goto', index: -1 })).toBeNull();
    expect(parse({ t: 'goto', index: 1.5 })).toBeNull();
    expect(parse({ t: 'pointer', tool: 'pen', on: true, x: 0, y: 0 })).toBeNull();
    expect(parse({ t: 'pointer', tool: 'laser', on: true, x: 2, y: 0 })).toBeNull();
    expect(parse({ t: 'stroke', id: 'a', color: 'red', pts: [0, 0, 1], end: false })).toBeNull();
    expect(parse({ t: 'stroke', id: 'a', color: 'pink', pts: [], end: false })).toBeNull();
    expect(parse({ t: 'timerTarget', ms: -5 })).toBeNull();
    expect(parse({ t: 'cue', cue: 'airhorn', on: true })).toBeNull();
    expect(parse({ t: 'cue', cue: 'confetti' })).toBeNull();
    expect(parse({ t: 'hello', v: 1, device: { id: '', name: 'x', platform: 'web' } })).toBeNull();
    expect(parse({ t: 'unknown' })).toBeNull();
    expect(parse([1, 2])).toBeNull();
  });

  it('좌표 배열이 너무 크면 버린다', () => {
    const pts = new Array(1000).fill(0.5);
    expect(parse({ t: 'stroke', id: 'a', color: 'red', pts, end: false })).toBeNull();
  });
});

describe('pairing url', () => {
  it('만든 주소를 다시 읽을 수 있다', () => {
    const p = { host: '192.168.0.12', port: 4747, token: 'abc123' };
    expect(parsePairingUrl(pairingUrl(p))).toEqual(p);
  });
  it('https 나 토큰 없는 주소는 거절한다', () => {
    expect(parsePairingUrl('https://a.b/?k=x')).toBeNull();
    expect(parsePairingUrl('http://a.b/')).toBeNull();
    expect(parsePairingUrl('garbage')).toBeNull();
  });
});

describe('timer', () => {
  it('경과 시간', () => {
    expect(timerElapsed({ running: true, startedAt: 1000, elapsedMs: 500, targetMs: null }, 3000)).toBe(2500);
    expect(timerElapsed({ running: false, startedAt: null, elapsedMs: 500, targetMs: null }, 9999)).toBe(500);
  });
  it('알림 지점을 지날 때만 잡는다', () => {
    expect(crossedAlerts(301_000, 299_000)).toEqual([300_000]);
    expect(crossedAlerts(299_000, 298_000)).toEqual([]);
    expect(crossedAlerts(500, -10)).toEqual([0]);
  });
  it('시계 표기', () => {
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(3_723_000)).toBe('1:02:03');
    expect(formatClock(-30_000)).toBe('-0:30');
  });
});
