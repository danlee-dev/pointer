// userData 폴더에 JSON 으로 남기는 것들: 설정, 최근 자료, 장별 메모, 연결 토큰.
// 계정·서버 없이 이 컴퓨터 안에만 저장한다.

import { app } from 'electron';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dir = () => app.getPath('userData');

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir(), file), 'utf8')) as T;
  } catch {
    return fallback;
  }
}

// 쓰다가 앱이 죽어도 파일이 반쯤 깨지지 않게 임시 파일에 쓰고 rename 한다.
function writeJson(file: string, value: unknown) {
  const full = path.join(dir(), file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const tmp = `${full}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, full);
}

// ---------- 설정 ----------

export interface Settings {
  language: 'system' | 'ko' | 'en';
  /** 여러 네트워크 주소 중 사용자가 고른 것 */
  address: string | null;
  /** "화면 바꾸기" 로 마지막에 고른 청중 화면 모니터 */
  audienceDisplay: number | null;
}

const DEFAULT_SETTINGS: Settings = { language: 'system', address: null, audienceDisplay: null };

export const settings = {
  get: (): Settings => ({ ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>('settings.json', {}) }),
  set(patch: Partial<Settings>) {
    writeJson('settings.json', { ...settings.get(), ...patch });
  },
};

// ---------- 최근 자료 ----------

export interface RecentEntry {
  paths: string[];
  title: string;
  kind: 'pdf' | 'images';
  pages: number;
  openedAt: number;
}

const MAX_RECENT = 12;
const sameEntry = (a: string[], b: string[]) => a.length === b.length && a.every((p, i) => p === b[i]);

export const recent = {
  list: (): RecentEntry[] => readJson<RecentEntry[]>('recent.json', []),
  add(entry: RecentEntry) {
    const rest = recent.list().filter((e) => !sameEntry(e.paths, entry.paths));
    writeJson('recent.json', [entry, ...rest].slice(0, MAX_RECENT));
  },
  /** 변환해서 연 자료: 목록에는 변환된 PDF 대신 원래 파일을 남긴다 */
  replaceLatest(paths: string[], patch: Pick<RecentEntry, 'paths' | 'title'>) {
    const list = recent.list();
    const i = list.findIndex((e) => sameEntry(e.paths, paths));
    if (i < 0) return;
    const entry = { ...list[i]!, ...patch };
    const rest = list.filter((e, j) => j !== i && !sameEntry(e.paths, patch.paths));
    writeJson('recent.json', [entry, ...rest].slice(0, MAX_RECENT));
  },
  remove(paths: string[]) {
    writeJson('recent.json', recent.list().filter((e) => !sameEntry(e.paths, paths)));
  },
};

// ---------- 장별 메모 ----------
// 자료 내용 해시(deckId)로 저장해서 파일 이름이 바뀌거나 옮겨도 메모가 따라간다.

type NotesFile = Record<string, string>;
const notesFile = (deckId: string) => path.join('notes', `${deckId.replace(/[^a-z0-9]/gi, '')}.json`);

export const notes = {
  all: (deckId: string): NotesFile => readJson<NotesFile>(notesFile(deckId), {}),
  get: (deckId: string, index: number): string => notes.all(deckId)[String(index)] ?? '',
  set(deckId: string, index: number, text: string) {
    const all = notes.all(deckId);
    if (text.trim()) all[String(index)] = text;
    else delete all[String(index)];
    writeJson(notesFile(deckId), all);
  },
};

// ---------- 연결 토큰 ----------
// QR 주소에 들어가는 비밀값. "QR 새로 만들기" 를 누르면 바뀌고 예전 QR 은 막힌다.

export const token = {
  get(): string {
    const saved = readJson<{ token?: string }>('pairing.json', {}).token;
    if (saved && /^[a-f0-9]{12,}$/.test(saved)) return saved;
    return token.rotate();
  },
  rotate(): string {
    const t = randomBytes(8).toString('hex');
    writeJson('pairing.json', { token: t });
    return t;
  },
};

// ---------- AI(MCP) 토큰 ----------
// 폰 연결 토큰과 따로 둔다. 폰 QR 을 새로 만들어도 AI 설정은 그대로 둔다.

export const aiToken = {
  get(): string {
    const saved = readJson<{ token?: string }>('ai.json', {}).token;
    if (saved && /^[a-f0-9]{24,}$/.test(saved)) return saved;
    const t = randomBytes(16).toString('hex');
    writeJson('ai.json', { token: t });
    return t;
  },
};
