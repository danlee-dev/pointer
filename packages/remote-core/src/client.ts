// 데스크톱 앱과의 WebSocket 연결.
// 끊기면 알아서 다시 붙고, 다시 못 붙는 이유(QR 이 바뀜, 버전 다름, 끊김 당함)는 화면에 알린다.
// 브라우저(안드로이드 웹 리모컨)와 React Native(iOS 앱) 둘 다에 있는 WebSocket·fetch 만 쓴다.

import {
  PROTOCOL_VERSION,
  wsUrl,
  type ClientMessage,
  type DeviceInfo,
  type Pairing,
  type PresentationState,
  type ServerMessage,
} from '@pointer/protocol';

export type Status = 'connecting' | 'open' | 'reconnecting' | 'expired' | 'revoked' | 'version';

export interface Snapshot {
  status: Status;
  state: PresentationState | null;
  /** 데스크톱 시계 - 폰 시계 (ms). 타이머를 맞추는 데 쓴다 */
  clockOffset: number;
  /** 왕복 지연 (ms) */
  latency: number | null;
}

const BACKOFF = [300, 600, 1200, 2000, 3000];

export class RemoteClient {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private stopped = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private snap: Snapshot = { status: 'connecting', state: null, clockOffset: 0, latency: null };

  constructor(
    private pairing: Pairing,
    private device: DeviceInfo,
  ) {}

  // ---------- React useSyncExternalStore 용 ----------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snap;

  private set(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    for (const fn of this.listeners) fn();
  }

  connect() {
    if (this.stopped) return;
    this.clearTimers();
    this.ws?.close();
    const ws = new WebSocket(wsUrl(this.pairing));
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.raw({ t: 'hello', v: PROTOCOL_VERSION, device: this.device });
      this.pingTimer = setInterval(() => this.raw({ t: 'ping', at: Date.now() }), 2000);
    };

    ws.onmessage = (ev) => {
      let m: ServerMessage;
      try {
        m = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return;
      }
      switch (m.t) {
        case 'welcome':
          this.set({ status: 'open' });
          this.raw({ t: 'ping', at: Date.now() });
          break;
        case 'state':
          this.set({ state: m.state, clockOffset: m.state.now - Date.now(), status: 'open' });
          break;
        case 'pong':
          this.set({ latency: Date.now() - m.at });
          break;
        case 'bye':
          // replaced: 같은 폰의 새 연결이 생겼다는 뜻이라 조용히 물러난다
          if (m.reason === 'revoked') this.halt('revoked');
          else if (m.reason === 'version') this.halt('version');
          else this.stopped = true;
          break;
      }
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.clearTimers();
      if (this.stopped) return;
      this.set({ status: this.snap.state ? 'reconnecting' : 'connecting', latency: null });
      void this.retry();
    };
  }

  /** WebSocket 은 거절 이유를 알려 주지 않는다. 토큰이 아직 맞는지 따로 물어본다 */
  private async retry() {
    try {
      const r = await fetch(`http://${this.pairing.host}:${this.pairing.port}/api/check?k=${encodeURIComponent(this.pairing.token)}`, {
        cache: 'no-store',
      });
      if (r.status === 401) return this.halt('expired');
    } catch {
      // 네트워크가 아예 안 닿는 상태. 계속 다시 시도한다.
    }
    const delay = BACKOFF[Math.min(this.attempt, BACKOFF.length - 1)]!;
    this.attempt += 1;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private halt(status: Status) {
    this.stopped = true;
    this.clearTimers();
    this.ws?.close();
    this.set({ status, latency: null });
  }

  /** 연결을 끝낸다 (다른 컴퓨터로 바꿀 때). 다시 붙지 않는다 */
  close() {
    this.stopped = true;
    this.clearTimers();
    this.ws?.close();
  }

  /** 폰 화면이 꺼졌다 켜지면 연결이 죽어 있는 경우가 많다. 바로 다시 붙는다 */
  wake() {
    if (this.stopped) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.attempt = 0;
      this.connect();
    }
  }

  send(msg: Exclude<ClientMessage, { t: 'hello' } | { t: 'ping' }>) {
    this.raw(msg);
  }

  private raw(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** 낙관적 반영: 누르는 즉시 화면을 바꾸고, 진짜 상태가 오면 그걸로 덮는다 */
  patchState(patch: Partial<PresentationState>) {
    if (this.snap.state) this.set({ state: { ...this.snap.state, ...patch } });
  }

  private clearTimers() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.pingTimer = this.retryTimer = null;
  }
}
