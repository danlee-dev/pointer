// PDF 발표 서버. 맥 브라우저는 http://localhost:4000 (발표 화면),
// 폰은 터미널에 찍히는 QR 주소 (리모컨) 로 접속한다.
//
// 맥 밖(같은 와이파이)에서 오는 요청은 URL 의 k 토큰이 맞아야 받는다.
// 강의실 와이파이에서 다른 사람이 슬라이드를 넘기지 못하게 하려는 것.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;

// ---------- PDF -> 이미지 ----------

const arg = process.argv[2];
if (!arg) {
  console.error('사용법: npm start -- "<발표자료.pdf>"');
  process.exit(1);
}
const pdfPath = path.resolve(arg.replace(/^~(?=\/)/, os.homedir()));
if (!fs.existsSync(pdfPath)) {
  console.error(`PDF 가 없음: ${pdfPath}`);
  process.exit(1);
}

const pdfStat = fs.statSync(pdfPath);
const cacheKey = crypto
  .createHash('sha1')
  .update(`${pdfPath}:${pdfStat.size}:${pdfStat.mtimeMs}`)
  .digest('hex')
  .slice(0, 12);
const cacheDir = path.join(ROOT, 'cache', cacheKey);

const pageNo = (f) => Number(f.match(/-(\d+)\.jpg$/)[1]);

// 렌더 도중 죽으면 반쯤 찬 폴더가 남지 않게 .tmp 에 그린 뒤 rename 한다.
function render(kind, width) {
  const dir = path.join(cacheDir, kind);
  if (!fs.existsSync(dir)) {
    const tmp = `${dir}.tmp`;
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    execFileSync('pdftoppm', [
      '-jpeg', '-jpegopt', 'quality=90',
      '-scale-to-x', String(width), '-scale-to-y', '-1',
      pdfPath, path.join(tmp, 'p'),
    ]);
    fs.renameSync(tmp, dir);
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jpg'))
    .sort((a, b) => pageNo(a) - pageNo(b))
    .map((f) => path.join(dir, f));
}

function pageAspect() {
  const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const m = info.match(/Page size:\s+([\d.]+) x ([\d.]+)/);
  return m ? Number(m[1]) / Number(m[2]) : 16 / 9;
}

console.log(`> PDF: ${pdfPath}`);
console.log('> 슬라이드 이미지 만드는 중 (처음 한 번만)...');
const slides = {
  full: render('full', 3840), // 레티나 맥 / 4K 화면에서도 글자가 안 뭉개지게 2배
  thumb: render('thumb', 960), // 폰 리모컨용
};
const total = slides.full.length;
const aspect = pageAspect();
console.log(`> ${total}장 준비 완료`);

// ---------- 접근 토큰 ----------

const tokenFile = path.join(ROOT, '.token');
const token = fs.existsSync(tokenFile)
  ? fs.readFileSync(tokenFile, 'utf8').trim()
  : (() => {
      const t = crypto.randomBytes(4).toString('hex');
      fs.writeFileSync(tokenFile, t);
      return t;
    })();

function lanIp() {
  const nets = os.networkInterfaces();
  const order = ['en0', 'en1', ...Object.keys(nets)];
  for (const name of order) {
    for (const n of nets[name] ?? []) {
      if (n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return null;
}

const remoteUrl = () => {
  const ip = lanIp();
  return ip ? `http://${ip}:${PORT}/r?k=${token}` : null;
};

const isLocal = (req) =>
  ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

function cookieToken(req) {
  const m = (req.headers.cookie ?? '').match(/(?:^|;\s*)k=([^;]+)/);
  return m ? m[1] : null;
}

function authorized(req, url) {
  if (isLocal(req)) return true;
  return url.searchParams.get('k') === token || cookieToken(req) === token;
}

// ---------- 상태 + 실시간 (SSE) ----------

const state = { index: 0, black: false };
const clients = new Set(); // { res, role }

const count = (role) => [...clients].filter((c) => c.role === role).length;
const snapshot = () => ({
  ...state,
  total,
  remotes: count('remote'),
});

function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data, role) {
  for (const c of clients) if (!role || c.role === role) send(c.res, event, data);
}

function applyCommand(cmd) {
  const clamp = (n) => Math.max(0, Math.min(total - 1, n));
  switch (cmd.type) {
    case 'next':
    case 'prev':
      // 화면을 가린 상태에서 넘기기를 누르면 페이지는 그대로 두고 화면만 다시 켠다.
      if (state.black) state.black = false;
      else state.index = clamp(state.index + (cmd.type === 'next' ? 1 : -1));
      break;
    case 'goto':
      if (Number.isInteger(cmd.n)) {
        state.index = clamp(cmd.n);
        state.black = false;
      }
      break;
    case 'black':
      state.black = !state.black;
      break;
    default:
      return false;
  }
  broadcast('state', snapshot());
  return true;
}

// ---------- HTTP ----------

function readJson(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(null);
      }
    });
  });
}

function sendFile(res, file, type, cache = 'no-cache') {
  fs.readFile(file, (err, buf) => {
    if (err) return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache }).end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  res.socket?.setNoDelay(true);

  if (!authorized(req, url)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('맥 터미널에 찍힌 QR 로 다시 접속하세요.');
  }

  if (p === '/' && req.method === 'GET') {
    return sendFile(res, path.join(ROOT, 'public/present.html'), 'text/html; charset=utf-8');
  }

  if ((p === '/r' || p === '/remote') && req.method === 'GET') {
    // 첫 접속의 ?k= 를 쿠키로 옮겨서 이후 이미지·이벤트 요청에도 따라가게 한다.
    if (url.searchParams.get('k') === token) {
      res.setHeader('Set-Cookie', `k=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
    }
    return sendFile(res, path.join(ROOT, 'public/remote.html'), 'text/html; charset=utf-8');
  }

  if (p === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ...snapshot(), aspect, title: path.basename(pdfPath, '.pdf') }));
  }

  if (p === '/api/qr.svg' && isLocal(req)) {
    const u = remoteUrl();
    if (!u) return res.writeHead(503).end();
    const svg = await QRCode.toString(u, { type: 'svg', margin: 1 });
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'X-Remote-Url': u, 'Cache-Control': 'no-store' });
    return res.end(svg);
  }

  const slide = p.match(/^\/slides\/(full|thumb)\/(\d+)\.jpg$/);
  if (slide) {
    const file = slides[slide[1]][Number(slide[2]) - 1];
    if (!file) return res.writeHead(404).end();
    return sendFile(res, file, 'image/jpeg', 'public, max-age=86400');
  }

  if (p === '/events') {
    const role = url.searchParams.get('role') === 'remote' ? 'remote' : 'present';
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    const client = { res, role };
    clients.add(client);
    send(res, 'state', snapshot());
    if (role === 'remote') broadcast('state', snapshot(), 'present');

    const ping = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(client);
      if (role === 'remote') {
        // 손가락을 댄 채로 폰이 잠기면 레이저가 화면에 남는다. 끊기면 끈다.
        broadcast('pointer', { on: false }, 'present');
        broadcast('state', snapshot(), 'present');
      }
    });
    return;
  }

  if (p === '/api/cmd' && req.method === 'POST') {
    const cmd = await readJson(req);
    const ok = cmd && applyCommand(cmd);
    res.writeHead(ok ? 200 : 400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(snapshot()));
  }

  if (p === '/api/pointer' && req.method === 'POST') {
    const pt = await readJson(req);
    if (!pt) return res.writeHead(400).end();
    const unit = (v) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : null);
    if (pt.on) {
      const x = unit(pt.x);
      const y = unit(pt.y);
      if (x === null || y === null) return res.writeHead(400).end();
      broadcast('pointer', { on: true, x, y }, 'present');
    } else {
      broadcast('pointer', { on: false }, 'present');
    }
    return res.writeHead(204).end();
  }

  res.writeHead(404).end();
});

async function printRemote() {
  const u = remoteUrl();
  if (!u) {
    console.log('\n! 네트워크 주소를 못 찾음. 와이파이 연결을 확인하세요.');
    return;
  }
  console.log(await QRCode.toString(u, { type: 'terminal', small: true }));
  console.log(`  폰 (같은 와이파이): ${u}`);
  console.log(`  맥 발표 화면:       http://localhost:${PORT}\n`);
}

server.listen(PORT, '0.0.0.0', async () => {
  await printRemote();
  // 핫스팟으로 갈아타는 등 주소가 바뀌면 QR 을 다시 찍는다.
  let last = lanIp();
  setInterval(() => {
    const now = lanIp();
    if (now !== last) {
      last = now;
      console.log('> 네트워크가 바뀜. 새 주소:');
      printRemote();
    }
  }, 5000);
});
