// 폰이 접속할 이 컴퓨터의 네트워크 주소 찾기.
// 가상 어댑터(도커, VM, VPN)는 폰이 못 닿는 주소라 뒤로 미룬다.

import os from 'node:os';

const VIRTUAL = /^(utun|awdl|llw|bridge|vmnet|vboxnet|docker|veth|vethernet|virtualbox|vmware|hyper-v|zerotier|tailscale|wsl)/i;
const PREFERRED = /^(en\d|wi-?fi|wlan|ethernet|eth\d|이더넷)/i;

function isPrivate(ip: string): boolean {
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

/** 쓸 만한 순서대로 정렬한 IPv4 주소 목록 */
export function lanAddresses(): string[] {
  const found: { ip: string; score: number }[] = [];
  for (const [name, nets] of Object.entries(os.networkInterfaces())) {
    for (const n of nets ?? []) {
      if (n.family !== 'IPv4' || n.internal || n.address.startsWith('169.254.')) continue;
      let score = 0;
      if (PREFERRED.test(name)) score += 2;
      if (isPrivate(n.address)) score += 1;
      if (VIRTUAL.test(name)) score -= 4;
      found.push({ ip: n.address, score });
    }
  }
  return found.sort((x, y) => y.score - x.score).map((f) => f.ip);
}
