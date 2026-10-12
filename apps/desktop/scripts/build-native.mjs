// 맥 전용 미러링 도우미(native/displays.swift)를 Intel·Apple Silicon 공용 바이너리로 만든다.
// 맥이 아니거나 swiftc(Xcode 명령행 도구)가 없으면 건너뛴다. 그 경우 미러링 자동 해제만 빠진다.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'native/displays.swift');
const out = path.join(root, 'native/bin/displays');

if (process.platform !== 'darwin') process.exit(0);
if (existsSync(out) && statSync(out).mtimeMs > statSync(src).mtimeMs) process.exit(0);

try {
  mkdirSync(path.dirname(out), { recursive: true });
  for (const arch of ['arm64', 'x86_64']) {
    execFileSync('swiftc', ['-O', src, '-o', `${out}-${arch}`, '-target', `${arch}-apple-macos12`], { stdio: 'inherit' });
  }
  execFileSync('lipo', ['-create', `${out}-arm64`, `${out}-x86_64`, '-output', out]);
  for (const arch of ['arm64', 'x86_64']) rmSync(`${out}-${arch}`);
  console.log('> native/bin/displays (universal)');
} catch (e) {
  console.warn('! 미러링 도우미를 만들지 못했습니다 (swiftc 필요). 미러링 자동 해제 없이 계속합니다.');
}
