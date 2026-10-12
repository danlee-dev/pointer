// QR 에 담기는 연결 주소. 브라우저(안드로이드)는 이 주소를 그대로 열고,
// iOS 앱은 같은 주소를 스캔해서 host/port/token 만 뽑아 쓴다.
//   http://192.168.0.12:4747/?k=1a2b3c4d5e6f

export interface Pairing {
  host: string;
  port: number;
  token: string;
}

export function pairingUrl(p: Pairing): string {
  return `http://${p.host}:${p.port}/?k=${encodeURIComponent(p.token)}`;
}

export function parsePairingUrl(url: string): Pairing | null {
  try {
    const u = new URL(url);
    const token = u.searchParams.get('k');
    const port = Number(u.port || 80);
    if (u.protocol !== 'http:' || !token || !u.hostname) return null;
    return { host: u.hostname, port, token };
  } catch {
    return null;
  }
}

export const wsUrl = (p: Pairing) => `ws://${p.host}:${p.port}/ws?k=${encodeURIComponent(p.token)}`;

export const thumbUrl = (p: Pairing, deckId: string, index: number) =>
  `http://${p.host}:${p.port}/thumb/${deckId}/${index}.jpg?k=${encodeURIComponent(p.token)}`;
