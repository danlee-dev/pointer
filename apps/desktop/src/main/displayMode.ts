// 미러링 상태에서 발표를 시작하면 두 화면에 같은 것이 나와서 발표자 화면을 따로 볼 수 없다.
// PowerPoint for Mac 처럼, 발표하는 동안만 미러링을 끄고(확장 모드) 끝나면 되돌린다.
//   맥     native/displays (CoreGraphics). Electron 에는 미러링 API 가 없다
//   윈도우  OS 기본 DisplaySwitch.exe
// 미러링 중에는 Electron 이 화면을 하나로만 보기 때문에, 화면이 실제로 몇 개인지는 OS 에 따로 묻는다.

import { app, screen } from 'electron';
import { execFile, execFileSync } from 'node:child_process';
import path from 'node:path';

export type MirrorSnapshot =
  | { platform: 'darwin'; groups: { master: number; slaves: number[] }[] }
  | { platform: 'win32' };

interface MacDisplay {
  id: number;
  mirrorOf: number;
}

function run(cmd: string, args: string[], timeout = 8000): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) =>
    execFile(cmd, args, { timeout, windowsHide: true }, (err, stdout) => resolve({ ok: !err, out: String(stdout) })),
  );
}

const macHelper = () =>
  app.isPackaged ? path.join(process.resourcesPath, 'native', 'displays') : path.join(app.getAppPath(), 'native/bin/displays');

/** 화면 개수가 원하는 만큼 될 때까지 (OS 가 화면을 다시 잡는 데 1~2초 걸린다) */
async function waitForDisplays(min: number, ms = 5000) {
  const until = Date.now() + ms;
  while (screen.getAllDisplays().length < min && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 200));
  }
  // 개수가 맞아도 위치·크기가 자리 잡을 시간을 조금 더 준다
  await new Promise((r) => setTimeout(r, 400));
}

async function windowsMonitorCount(): Promise<number> {
  const r = await run('powershell.exe', [
    '-NoProfile',
    '-Command',
    '(Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorBasicDisplayParams | Where-Object Active).Count',
  ]);
  return r.ok ? Number(r.out.trim()) || 0 : 0;
}

/** 미러링 중이면 확장 모드로 바꾸고, 되돌릴 때 쓸 원래 상태를 돌려준다. 미러링이 아니면 null */
export async function unmirrorForPresenting(): Promise<MirrorSnapshot | null> {
  if (process.platform === 'darwin') {
    const r = await run(macHelper(), ['status']);
    if (!r.ok) return null;
    let displays: MacDisplay[];
    try {
      displays = (JSON.parse(r.out) as { displays: MacDisplay[] }).displays;
    } catch {
      return null;
    }
    const mirrored = displays.filter((d) => d.mirrorOf !== 0);
    if (mirrored.length === 0) return null;
    const groups = new Map<number, number[]>();
    for (const d of mirrored) groups.set(d.mirrorOf, [...(groups.get(d.mirrorOf) ?? []), d.id]);
    if (!(await run(macHelper(), ['extend'])).ok) return null;
    await waitForDisplays(2);
    return { platform: 'darwin', groups: [...groups].map(([master, slaves]) => ({ master, slaves })) };
  }

  if (process.platform === 'win32') {
    const monitors = await windowsMonitorCount();
    if (monitors <= screen.getAllDisplays().length) return null;
    await run('DisplaySwitch.exe', ['/extend']);
    await waitForDisplays(2, 3000);
    // Windows 11 24H2 부터는 /extend 대신 숫자 인자를 받는다
    if (screen.getAllDisplays().length < 2) {
      await run('DisplaySwitch.exe', ['3']);
      await waitForDisplays(2);
    }
    return screen.getAllDisplays().length > 1 ? { platform: 'win32' } : null;
  }

  return null;
}

export async function restoreMirror(s: MirrorSnapshot) {
  if (s.platform === 'darwin') {
    for (const g of s.groups) await run(macHelper(), ['mirror', String(g.master), ...g.slaves.map(String)]);
  } else {
    const before = screen.getAllDisplays().length;
    await run('DisplaySwitch.exe', ['/clone']);
    await new Promise((r) => setTimeout(r, 1500));
    if (screen.getAllDisplays().length === before) await run('DisplaySwitch.exe', ['2']);
  }
}

/** 앱이 꺼지는 순간에는 기다릴 수 없어서 동기로 되돌린다 */
export function restoreMirrorSync(s: MirrorSnapshot) {
  try {
    if (s.platform === 'darwin') {
      for (const g of s.groups) execFileSync(macHelper(), ['mirror', String(g.master), ...g.slaves.map(String)], { timeout: 5000 });
    } else {
      execFileSync('DisplaySwitch.exe', ['/clone'], { timeout: 5000, windowsHide: true });
    }
  } catch {
    // 되돌리기에 실패해도 맥은 .forSession 이라 다음 로그인 때 원래대로 돌아간다
  }
}
