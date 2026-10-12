import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { KEYNOTE_EXPORT, POWERPOINT_EXPORT } from './appleScripts';

// 문법만 검사한다 (앱을 띄우지 않는다). 맥에서만 돈다.
describe.runIf(process.platform === 'darwin')('AppleScript 문법', () => {
  for (const [name, src] of Object.entries({ KEYNOTE_EXPORT, POWERPOINT_EXPORT })) {
    it(`${name} 이 컴파일된다`, () => {
      const dir = mkdtempSync(path.join(os.tmpdir(), 'pointer-osa-'));
      try {
        writeFileSync(path.join(dir, 's.applescript'), src);
        expect(() => execFileSync('osacompile', ['-o', path.join(dir, 's.scpt'), path.join(dir, 's.applescript')], { stdio: 'pipe' })).not.toThrow();
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
