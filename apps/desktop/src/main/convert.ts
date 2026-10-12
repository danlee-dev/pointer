// PowerPoint·Keynote·OpenDocument 발표 파일을 PDF 로 바꾼다.
// 직접 그리면 글꼴·배치가 어긋나므로, 이 컴퓨터에 깔린 발표 앱에게 내보내기를 시킨다.
//
//   맥      PowerPoint (pptx·ppt 가장 정확) -> Keynote (key, pptx) -> LibreOffice
//   윈도우  PowerPoint (COM)              -> LibreOffice
//
// 맥의 PowerPoint·Keynote 는 샌드박스 앱이라 자기 컨테이너 밖 파일을 열거나 쓰면 권한 창을 띄우고 멈춘다.
// 그래서 원본을 그 앱의 컨테이너 tmp 폴더에 복사해서 열고, 같은 폴더로 내보낸 뒤 꺼내 온다.
// 대화상자에 걸려 멈추는 경우가 있어 시간 제한을 둔다. 우리가 띄운 앱이면 끝나고 닫는다.
//
// 같은 파일은 다시 바꾸지 않는다: 내용 해시로 userData/converted 에 PDF 와 노트를 남긴다.
// (PDF 가 바뀌면 자료 id 가 바뀌어 장별 메모를 잃는다)

import { app } from 'electron';
import { execFile, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractPptxNotes } from './pptxNotes';
import { KEYNOTE_EXPORT, POWERPOINT_EXPORT } from './appleScripts';

export const PRESENTATION_EXT = ['.pptx', '.ppt', '.ppsx', '.pps', '.potx', '.key', '.odp'];
export const isPresentation = (p: string) => PRESENTATION_EXT.includes(path.extname(p).toLowerCase());

export type Converter = 'powerpoint' | 'keynote' | 'libreoffice';

export type ConvertResult =
  | { ok: true; pdf: string; notes: string[] | null; via: Converter; cached: boolean }
  | { ok: false; reason: 'noConverter' | 'convertFailed' | 'convertTimeout' };

const TIMEOUT_MS = 180_000;
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

// ---------- 어떤 앱이 깔려 있나 ----------

function firstExisting(paths: string[]): string | null {
  return paths.find((p) => existsSync(p)) ?? null;
}

const home = os.homedir();
const MAC_APPS = {
  powerpoint: ['/Applications/Microsoft PowerPoint.app', `${home}/Applications/Microsoft PowerPoint.app`],
  keynote: ['/Applications/Keynote.app', `${home}/Applications/Keynote.app`],
  libreoffice: ['/Applications/LibreOffice.app/Contents/MacOS/soffice', `${home}/Applications/LibreOffice.app/Contents/MacOS/soffice`],
};
const WIN_SOFFICE = [
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
];

const CONTAINER = {
  powerpoint: `${home}/Library/Containers/com.microsoft.Powerpoint/Data/tmp`,
  keynote: `${home}/Library/Containers/com.apple.iWork.Keynote/Data/tmp`,
};

/** 이 파일을 바꿀 수 있는 앱을 시도할 순서대로 */
async function candidates(ext: string): Promise<Converter[]> {
  const out: Converter[] = [];
  if (isMac) {
    const hasPpt = !!firstExisting(MAC_APPS.powerpoint);
    const hasKey = !!firstExisting(MAC_APPS.keynote);
    if (ext === '.key') {
      if (hasKey) out.push('keynote');
    } else if (ext === '.odp') {
      if (hasPpt) out.push('powerpoint');
    } else {
      if (hasPpt) out.push('powerpoint');
      if (hasKey) out.push('keynote');
    }
    if (firstExisting(MAC_APPS.libreoffice)) out.push('libreoffice');
  } else if (isWin) {
    if (ext !== '.key' && (await windowsHasPowerPoint())) out.push('powerpoint');
    if (firstExisting(WIN_SOFFICE)) out.push('libreoffice');
  } else if (await which('soffice')) {
    out.push('libreoffice');
  }
  return out;
}

function which(cmd: string): Promise<string | null> {
  return new Promise((resolve) =>
    execFile(isWin ? 'where' : 'which', [cmd], (err, stdout) => resolve(err ? null : String(stdout).split(/\r?\n/)[0] || null)),
  );
}

function windowsHasPowerPoint(): Promise<boolean> {
  return new Promise((resolve) =>
    execFile('reg', ['query', 'HKCR\\PowerPoint.Application'], { windowsHide: true }, (err) => resolve(!err)),
  );
}

// ---------- 실행 도우미 ----------

/** 시간 제한이 있는 실행. 넘기면 죽이고 'timeout' */
function run(cmd: string, args: string[], opts: { input?: string; timeout?: number } = {}): Promise<{ ok: boolean; out: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let out = '';
    let done = false;
    const finish = (ok: boolean, timedOut = false) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ ok, out, timedOut });
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(false, true);
    }, opts.timeout ?? TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += String(d)));
    child.stderr.on('data', (d) => (out += String(d)));
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
    if (opts.input !== undefined) child.stdin.end(opts.input);
  });
}

const osa = (script: string, args: string[], timeout?: number) => run('osascript', ['-', ...args], { input: script, timeout });

async function macAppRunning(name: string): Promise<boolean> {
  const r = await osa(`return application "${name}" is running`, [], 10_000);
  return r.ok && r.out.trim() === 'true';
}

// ---------- 앱별 변환 ----------

const US = '\u001f'; // 노트 사이 구분자 (노트 글에 나올 일이 없는 제어 문자)

/** PowerPoint for Mac. 노트는 PPTX XML 에서 따로 읽는다 */
async function viaPowerPointMac(src: string, work: string): Promise<'ok' | 'fail' | 'timeout'> {
  const input = path.join(work, `in${path.extname(src)}`);
  const output = path.join(work, 'out.pdf');
  await fs.copyFile(src, input);
  const wasRunning = await macAppRunning('Microsoft PowerPoint');
  const r = await osa(
    POWERPOINT_EXPORT,
    [input, output],
  );
  // PowerPoint 는 'quit saving no' 를 받고도 그냥 무시한다. 우리 문서는 이미 닫았으니 그냥 quit 한다
  if (!wasRunning) void osa('tell application "Microsoft PowerPoint" to quit', [], 15_000);
  if (r.timedOut) return 'timeout';
  return r.ok && existsSync(output) ? 'ok' : 'fail';
}

/** Keynote. pptx 도 열 수 있고, 노트와 건너뛴 장 정보를 AppleScript 로 직접 준다 */
async function viaKeynote(src: string, work: string): Promise<{ status: 'ok' | 'fail' | 'timeout'; notes: string[] | null }> {
  const input = path.join(work, `in${path.extname(src)}`);
  const output = path.join(work, 'out.pdf');
  await fs.copyFile(src, input);
  const wasRunning = await macAppRunning('Keynote');
  const r = await osa(
    KEYNOTE_EXPORT,
    [input, output],
  );
  if (!wasRunning) void osa('tell application "Keynote" to quit', [], 15_000);
  if (r.timedOut) return { status: 'timeout', notes: null };
  if (!r.ok || !existsSync(output)) return { status: 'fail', notes: null };
  // osascript 는 결과 끝에 줄바꿈을 붙인다
  const raw = r.out.replace(/\n$/, '');
  const notes = raw.split(US).slice(0, -1).map((n) => n.replace(/\r/g, '\n').trim());
  return { status: 'ok', notes };
}

/** Windows PowerPoint (COM). ppSaveAsPDF = 32 */
async function viaPowerPointWin(src: string, work: string): Promise<'ok' | 'fail' | 'timeout'> {
  const output = path.join(work, 'out.pdf');
  // 경로에 공백이 있어도 깨지지 않게 -Command 대신 스크립트 파일 + 인자로 넘긴다
  const script = path.join(work, 'export.ps1');
  await fs.writeFile(
    script,
    `
$ErrorActionPreference = 'Stop'
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($args[0], $true, $false, $false)
  $pres.SaveAs($args[1], 32)
  $pres.Close()
} finally {
  if ($app.Presentations.Count -eq 0) { $app.Quit() }
}`,
  );
  const r = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, src, output]);
  if (r.timedOut) return 'timeout';
  return r.ok && existsSync(output) ? 'ok' : 'fail';
}

/** LibreOffice. 사용자의 LibreOffice 가 켜져 있어도 부딪히지 않게 별도 프로필로 돌린다 */
async function viaLibreOffice(src: string, work: string): Promise<'ok' | 'fail' | 'timeout'> {
  const soffice = isMac ? firstExisting(MAC_APPS.libreoffice) : isWin ? firstExisting(WIN_SOFFICE) : await which('soffice');
  if (!soffice) return 'fail';
  const input = path.join(work, `in${path.extname(src)}`);
  await fs.copyFile(src, input);
  const profile = pathToFileURL(path.join(work, 'lo-profile')).href;
  const r = await run(soffice, [`-env:UserInstallation=${profile}`, '--headless', '--convert-to', 'pdf', '--outdir', work, input]);
  if (r.timedOut) return 'timeout';
  const output = path.join(work, 'in.pdf');
  if (!r.ok || !existsSync(output)) return 'fail';
  await fs.rename(output, path.join(work, 'out.pdf'));
  return 'ok';
}

// ---------- 바깥에서 부르는 곳 ----------

async function workDir(via: Converter): Promise<string> {
  const base = isMac && via !== 'libreoffice' ? CONTAINER[via] : path.join(app.getPath('temp'), 'pointer-convert');
  const dir = path.join(base, `pointer-${randomBytes(6).toString('hex')}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

interface CacheMeta {
  via: Converter;
  notes: string[] | null;
}

export async function convertPresentation(src: string, onStart: (via: Converter) => void): Promise<ConvertResult> {
  const bytes = await fs.readFile(src);
  const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 16);
  const cacheDir = path.join(app.getPath('userData'), 'converted');
  const cachedPdf = path.join(cacheDir, `${hash}.pdf`);
  const cachedMeta = path.join(cacheDir, `${hash}.json`);

  if (existsSync(cachedPdf) && existsSync(cachedMeta)) {
    const meta = JSON.parse(await fs.readFile(cachedMeta, 'utf8')) as CacheMeta;
    return { ok: true, pdf: cachedPdf, notes: meta.notes, via: meta.via, cached: true };
  }

  const ext = path.extname(src).toLowerCase();
  let order = await candidates(ext);
  // 개발용: POINTER_CONVERTER=keynote 처럼 특정 변환기만 쓰게 해서 각 경로를 따로 확인한다
  const forced = process.env['POINTER_CONVERTER'] as Converter | undefined;
  if (forced && !app.isPackaged) order = order.filter((c) => c === forced);
  if (order.length === 0) return { ok: false, reason: 'noConverter' };

  // pptx 계열은 노트를 XML 에서 바로 읽는다 (어느 변환기를 쓰든 같은 결과)
  const xmlNotes = ['.pptx', '.ppsx', '.potx'].includes(ext) ? extractPptxNotes(bytes) : null;

  let sawTimeout = false;
  for (const via of order) {
    onStart(via);
    const work = await workDir(via);
    try {
      let notes = xmlNotes;
      let status: 'ok' | 'fail' | 'timeout';
      if (via === 'keynote') {
        const r = await viaKeynote(src, work);
        status = r.status;
        notes = xmlNotes ?? r.notes;
      } else if (via === 'powerpoint') {
        status = isMac ? await viaPowerPointMac(src, work) : await viaPowerPointWin(src, work);
      } else {
        status = await viaLibreOffice(src, work);
      }
      if (status === 'timeout') sawTimeout = true;
      if (status !== 'ok') continue;

      await fs.mkdir(cacheDir, { recursive: true });
      await fs.copyFile(path.join(work, 'out.pdf'), cachedPdf);
      await fs.writeFile(cachedMeta, JSON.stringify({ via, notes } satisfies CacheMeta));
      return { ok: true, pdf: cachedPdf, notes, via, cached: false };
    } finally {
      await fs.rm(work, { recursive: true, force: true }).catch(() => {});
    }
  }
  return { ok: false, reason: sawTimeout ? 'convertTimeout' : 'convertFailed' };
}
