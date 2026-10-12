// AI(Claude Code, Claude Desktop, Codex 등)가 붙어서 발표 대본을 같이 쓰는 MCP 서버.
//   http://127.0.0.1:4750/mcp?k=<토큰>
// 이 컴퓨터 안에서만 열린다 (127.0.0.1). 토큰은 브라우저의 웹페이지가 몰래 부르는 것(DNS rebinding)을 막는다.
// 요청마다 서버를 새로 만드는 stateless 방식: 세션을 들고 있을 필요가 없다.
//
// AI 가 할 수 있는 일
//   get_presentation   지금 열린 자료 요약 (장 수, 현재 장, 메모 있는 장)
//   read_slides        장 글자 + 메모 (여러 장 한 번에)
//   view_slide         장 그림 (AI 가 화면 배치·도표를 직접 본다)
//   write_notes        한 장 메모 쓰기 (바꾸기 / 이어 쓰기)
//   write_notes_batch  여러 장 메모 한 번에
//   go_to_slide        리허설용 장 이동 (발표 중에는 막는다)

import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

export const DEFAULT_MCP_PORT = 4750;
const MAX_SLIDES_PER_READ = 40;

export interface McpDeps {
  getToken(): string;
  /** 열린 자료 요약. 자료가 없으면 null */
  info(): { title: string; slides: number; current: number; presenting: boolean } | null;
  getText(index: number): Promise<string | null>;
  getImage(index: number): Promise<Buffer | null>;
  getNotes(index: number): string;
  setNotes(index: number, text: string): void;
  goTo(index: number): void;
}

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const NO_DECK = '열린 발표 자료가 없습니다. pointer 앱에서 자료를 먼저 열어 달라고 사용자에게 말해 주세요.';

function buildServer(d: McpDeps): McpServer {
  const server = new McpServer({ name: 'pointer', version: '0.1.0' });

  /** 사람에게 보이는 장 번호는 1 부터. 범위를 벗어나면 에러 문장 */
  const checkSlide = (n: number): string | null => {
    const info = d.info();
    if (!info) return NO_DECK;
    if (n < 1 || n > info.slides) return `장 번호는 1 부터 ${info.slides} 사이여야 합니다.`;
    return null;
  };

  server.registerTool(
    'get_presentation',
    {
      title: '발표 자료 요약',
      description: '지금 pointer 앱에 열린 발표 자료의 제목, 장 수, 현재 장, 메모가 있는 장 번호를 알려 준다. 대본 작업을 시작할 때 먼저 부른다.',
      inputSchema: {},
    },
    async () => {
      const info = d.info();
      if (!info) return text(NO_DECK);
      const withNotes = Array.from({ length: info.slides }, (_, i) => i).filter((i) => d.getNotes(i).trim()).map((i) => i + 1);
      return text(
        JSON.stringify(
          {
            title: info.title,
            slides: info.slides,
            currentSlide: info.current + 1,
            presenting: info.presenting,
            slidesWithNotes: withNotes,
          },
          null,
          2,
        ),
      );
    },
  );

  server.registerTool(
    'read_slides',
    {
      title: '장 읽기',
      description: `장에 적힌 글자와 지금 달린 발표 메모를 읽는다. from~to (1 부터, 한 번에 ${MAX_SLIDES_PER_READ}장까지). 그림·도표는 글자로 안 나오니 필요하면 view_slide 로 본다.`,
      inputSchema: {
        from: z.number().int().min(1).describe('첫 장 번호 (1 부터)'),
        to: z.number().int().min(1).optional().describe('마지막 장 번호. 없으면 from 한 장만'),
      },
    },
    async ({ from, to }) => {
      const info = d.info();
      if (!info) return text(NO_DECK);
      const last = Math.min(to ?? from, info.slides, from + MAX_SLIDES_PER_READ - 1);
      const err = checkSlide(from);
      if (err) return text(err);
      const parts: string[] = [];
      for (let n = from; n <= last; n++) {
        const body = (await d.getText(n - 1)) ?? '';
        const notes = d.getNotes(n - 1);
        parts.push(`## ${n}장\n\n### 장에 적힌 글자\n${body || '(글자 없음 - 그림 위주의 장이면 view_slide 로 보세요)'}\n\n### 지금 메모\n${notes || '(없음)'}`);
      }
      if (last < (to ?? from)) parts.push(`(한 번에 ${MAX_SLIDES_PER_READ}장까지 읽습니다. ${last + 1}장부터 다시 부르세요.)`);
      return text(parts.join('\n\n---\n\n'));
    },
  );

  server.registerTool(
    'view_slide',
    {
      title: '장 보기',
      description: '장을 그림으로 본다. 도표·사진·배치처럼 글자로 안 잡히는 내용을 확인할 때 쓴다.',
      inputSchema: { slide: z.number().int().min(1).describe('장 번호 (1 부터)') },
    },
    async ({ slide }) => {
      const err = checkSlide(slide);
      if (err) return text(err);
      const img = await d.getImage(slide - 1);
      if (!img) return text('그림을 아직 못 만들었습니다. 잠시 뒤 다시 시도해 주세요.');
      return {
        content: [
          { type: 'image' as const, data: img.toString('base64'), mimeType: 'image/jpeg' },
          { type: 'text' as const, text: `${slide}장` },
        ],
      };
    },
  );

  server.registerTool(
    'write_notes',
    {
      title: '메모 쓰기',
      description:
        '한 장의 발표 메모(발표자가 보는 대본)를 쓴다. 쓰자마자 발표자 화면과 폰 리모컨에 보인다. 이미 메모가 있으면 사용자에게 먼저 확인받고 바꾼다. mode 가 append 면 기존 메모 뒤에 붙인다.',
      inputSchema: {
        slide: z.number().int().min(1).describe('장 번호 (1 부터)'),
        notes: z.string().max(20_000).describe('메모 내용. 발표자가 소리 내어 읽기 좋게 짧은 문장으로'),
        mode: z.enum(['replace', 'append']).optional().describe('replace(기본) 또는 append'),
      },
    },
    async ({ slide, notes, mode }) => {
      const err = checkSlide(slide);
      if (err) return text(err);
      const before = d.getNotes(slide - 1);
      const next = mode === 'append' && before.trim() ? `${before.trimEnd()}\n\n${notes}` : notes;
      d.setNotes(slide - 1, next);
      return text(`${slide}장 메모를 ${mode === 'append' ? '이어 썼습니다' : '저장했습니다'}.`);
    },
  );

  server.registerTool(
    'write_notes_batch',
    {
      title: '메모 여러 장 쓰기',
      description: '여러 장의 메모를 한 번에 바꾼다. 전체 대본 초안을 넣을 때 쓴다. 이미 메모가 있는 장은 사용자에게 먼저 확인받는다.',
      inputSchema: {
        items: z
          .array(z.object({ slide: z.number().int().min(1), notes: z.string().max(20_000) }))
          .min(1)
          .max(300),
      },
    },
    async ({ items }) => {
      const info = d.info();
      if (!info) return text(NO_DECK);
      const bad = items.filter((it) => it.slide > info.slides).map((it) => it.slide);
      if (bad.length) return text(`없는 장 번호: ${bad.join(', ')}. 장은 1~${info.slides} 입니다. 아무것도 저장하지 않았습니다.`);
      for (const it of items) d.setNotes(it.slide - 1, it.notes);
      return text(`${items.length}장의 메모를 저장했습니다.`);
    },
  );

  server.registerTool(
    'go_to_slide',
    {
      title: '장 이동',
      description: '발표자 화면을 해당 장으로 옮긴다. 리허설할 때만 쓴다. 청중 앞에서 발표 중이면 움직이지 않는다.',
      inputSchema: { slide: z.number().int().min(1) },
    },
    async ({ slide }) => {
      const err = checkSlide(slide);
      if (err) return text(err);
      if (d.info()?.presenting) return text('지금 청중 앞에서 발표 중이라 장을 옮기지 않았습니다.');
      d.goTo(slide - 1);
      return text(`${slide}장으로 옮겼습니다.`);
    },
  );

  server.registerPrompt(
    'write_script',
    {
      title: '발표 대본 같이 쓰기',
      description: '열린 발표 자료를 읽고 장별 대본을 같이 짠다.',
      argsSchema: {
        minutes: z.string().optional().describe('발표 시간 (분)'),
        audience: z.string().optional().describe('듣는 사람 (예: 신입생, 투자자)'),
        tone: z.string().optional().describe('말투 (예: 편하게, 격식 있게)'),
      },
    },
    ({ minutes, audience, tone }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'pointer 앱에 열린 발표 자료의 장별 대본(발표 메모)을 같이 쓰자.',
              minutes ? `발표 시간은 ${minutes}분이야.` : '',
              audience ? `듣는 사람은 ${audience}.` : '',
              tone ? `말투는 ${tone}.` : '',
              '',
              '순서:',
              '1. get_presentation 으로 자료를 확인한다.',
              '2. read_slides 로 전체를 읽고, 글자가 적거나 도표 위주인 장은 view_slide 로 직접 본다.',
              '3. 전체 흐름(도입, 핵심, 마무리)과 장별 시간 배분을 먼저 짧게 제안하고 내 의견을 묻는다.',
              '4. 합의되면 장마다 소리 내어 읽기 좋은 짧은 문장으로 대본을 쓴다. 슬라이드 글을 그대로 읽지 말고 덧붙일 말 위주로.',
              '5. 이미 메모가 있는 장은 바꾸기 전에 나에게 확인받는다. 확인되면 write_notes_batch 로 저장한다.',
            ]
              .filter(Boolean)
              .join('\n'),
          },
        },
      ],
    }),
  );

  return server;
}

function readBody(req: http.IncomingMessage, limit = 2_000_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve(undefined);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('bad json'));
      }
    });
    req.on('error', reject);
  });
}

export function createMcpServer(d: McpDeps) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    // 다른 이름(rebinding 된 도메인)으로 들어온 요청은 거절
    const host = (req.headers.host ?? '').replace(/:\d+$/, '');
    if (!['127.0.0.1', 'localhost'].includes(host)) return void res.writeHead(403).end();
    if (url.pathname !== '/mcp') return void res.writeHead(404).end();
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (url.searchParams.get('k') !== d.getToken() && bearer !== d.getToken()) return void res.writeHead(401).end();

    if (req.method !== 'POST') {
      // stateless 서버라 GET(알림 스트림)·DELETE(세션 끝) 은 받지 않는다
      return void res
        .writeHead(405, { 'Content-Type': 'application/json', Allow: 'POST' })
        .end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null }));
    }

    let body: unknown;
    try {
      body = await readBody(req);
    } catch {
      return void res.writeHead(400).end();
    }
    const mcp = buildServer(d);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void mcp.close();
    });
    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) res.writeHead(500).end();
    }
  });

  return {
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
          server.listen(port, '127.0.0.1', () => resolve(port));
        };
        tryListen();
      });
    },
    close() {
      server.close();
    },
  };
}
