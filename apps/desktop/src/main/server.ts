// 폰 리모컨용 서버. 같은 와이파이에서만 쓰는 HTTP + WebSocket.
//   GET  /              안드로이드 웹 리모컨 (정적 파일)
//   GET  /thumb/:deck/:n.jpg?k=   장 썸네일
//   GET  /api/check?k=  토큰이 아직 유효한지 (WebSocket 은 거절 이유를 못 알려 줘서 따로 묻는다)
//   WS   /ws?k=         명령·상태
// 토큰(k)이 맞지 않으면 아무것도 주지 않는다. 정적 파일만 예외 (코드일 뿐 자료가 아니다).

import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  PROTOCOL_VERSION,
  parseClientMessage,
  type ClientMessage,
  type DeviceInfo,
  type PresentationState,
  type ServerMessage,
} from '@pointer/protocol';

interface Options {
  staticDir: string;
  getToken(): string;
  getThumb(deckId: string, index: number): Promise<Buffer | null>;
  getState(): PresentationState;
  onMessage(device: DeviceInfo, msg: ClientMessage): void;
  onDevicesChanged(devices: DeviceInfo[]): void;
  onDeviceGone(device: DeviceInfo): void;
}

interface Peer {
  ws: WebSocket;
  device: DeviceInfo | null;
  alive: boolean;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

export function createRemoteServer(opts: Options) {
  const peers = new Set<Peer>();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

  const tokenOk = (url: URL) => url.searchParams.get('k') === opts.getToken();
  const devices = () => [...peers].flatMap((p) => (p.device ? [p.device] : []));
  const send = (ws: WebSocket, m: ServerMessage) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m));
  };

  function serveStatic(url: URL, res: http.ServerResponse) {
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.resolve(opts.staticDir, rel);
    // ../ 로 폴더 밖 파일을 읽지 못하게
    if (!file.startsWith(path.resolve(opts.staticDir) + path.sep)) return void res.writeHead(404).end();
    fs.readFile(file, (err, buf) => {
      if (err) return void res.writeHead(404).end();
      const type = MIME[path.extname(file)] ?? 'application/octet-stream';
      // index.html 은 앱이 업데이트되면 바로 바뀌어야 하고, 해시가 붙은 assets 는 오래 둬도 된다
      const cache = rel.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache }).end(buf);
    });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (req.method !== 'GET') return void res.writeHead(405).end();

    if (url.pathname === '/api/check') {
      return void res.writeHead(tokenOk(url) ? 204 : 401, { 'Cache-Control': 'no-store' }).end();
    }

    const thumb = url.pathname.match(/^\/thumb\/([a-f0-9]{8,64})\/(\d{1,5})\.jpg$/);
    if (thumb) {
      if (!tokenOk(url)) return void res.writeHead(401).end();
      const buf = await opts.getThumb(thumb[1]!, Number(thumb[2]));
      if (!buf) return void res.writeHead(404).end();
      return void res
        .writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' })
        .end(buf);
    }

    serveStatic(url, res);
  });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname !== '/ws' || !tokenOk(url)) {
      socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
      return;
    }
    // 레이저 좌표는 작은 패킷이 자주 간다. 모아서 보내지 말고 바로 보내게 (Nagle 끄기)
    if (socket instanceof net.Socket) socket.setNoDelay(true);
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws));
  });

  function onConnection(ws: WebSocket) {
    const peer: Peer = { ws, device: null, alive: true };
    peers.add(peer);

    // hello 를 안 보내는 연결은 오래 붙잡지 않는다
    const helloTimer = setTimeout(() => {
      if (!peer.device) ws.close();
    }, 5000);

    ws.on('pong', () => (peer.alive = true));
    ws.on('message', (data) => {
      const msg = parseClientMessage(data.toString());
      if (!msg) return;

      if (msg.t === 'hello') {
        clearTimeout(helloTimer);
        if (msg.v !== PROTOCOL_VERSION) {
          send(ws, { t: 'bye', reason: 'version' });
          ws.close();
          return;
        }
        // 같은 폰이 다시 붙으면 (화면 껐다 켜기 등) 예전 연결은 정리한다
        for (const p of peers) {
          if (p !== peer && p.device?.id === msg.device.id) {
            send(p.ws, { t: 'bye', reason: 'replaced' });
            p.device = null;
            p.ws.close();
          }
        }
        peer.device = msg.device;
        send(ws, { t: 'welcome', v: PROTOCOL_VERSION });
        send(ws, { t: 'state', state: opts.getState() });
        opts.onDevicesChanged(devices());
        return;
      }

      if (!peer.device) return;
      if (msg.t === 'ping') return send(ws, { t: 'pong', at: msg.at });
      opts.onMessage(peer.device, msg);
    });

    ws.on('close', () => {
      clearTimeout(helloTimer);
      peers.delete(peer);
      if (peer.device) {
        opts.onDeviceGone(peer.device);
        opts.onDevicesChanged(devices());
      }
    });
    ws.on('error', () => ws.terminate());
  }

  // 와이파이에서 조용히 사라진 폰을 10초 안에 정리한다
  const heartbeat = setInterval(() => {
    for (const p of peers) {
      if (!p.alive) {
        p.ws.terminate();
        continue;
      }
      p.alive = false;
      p.ws.ping();
    }
  }, 10_000);

  return {
    /** 비어 있는 포트를 찾아 연다 */
    listen(preferred: number): Promise<number> {
      return new Promise((resolve, reject) => {
        let port = preferred;
        const tryListen = () => {
          server.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE' && port < preferred + 20) {
              port += 1;
              tryListen();
            } else reject(err);
          });
          server.listen(port, '0.0.0.0', () => resolve(port));
        };
        tryListen();
      });
    },
    broadcastState() {
      const msg = JSON.stringify({ t: 'state', state: opts.getState() } satisfies ServerMessage);
      for (const p of peers) if (p.device && p.ws.readyState === p.ws.OPEN) p.ws.send(msg);
    },
    devices,
    kick(id: string) {
      for (const p of peers) {
        if (p.device?.id === id) {
          send(p.ws, { t: 'bye', reason: 'revoked' });
          p.ws.close();
        }
      }
    },
    /** 토큰이 바뀐 뒤 호출. 붙어 있는 폰을 전부 끊는다 */
    dropAll() {
      for (const p of peers) {
        send(p.ws, { t: 'bye', reason: 'revoked' });
        p.ws.close();
      }
    },
    close() {
      clearInterval(heartbeat);
      for (const p of peers) p.ws.terminate();
      wss.close();
      server.close();
    },
  };
}

export type RemoteServer = ReturnType<typeof createRemoteServer>;
