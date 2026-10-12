// 숨은 렌더 창. 화면에는 안 보인다.
//  1) 자료를 열어 장 수·크기를 main 에 알려 주고
//  2) 폰 리모컨과 발표자 화면 아래 줄에 쓸 썸네일을 차례로 그린다.
// 누가 특정 장을 달라고 하면 그 장부터 그린다.

import type { LoadedDeck } from './deck/loadDeck';
import { loadDeck } from './deck/loadDeck';

const THUMB_BOX = 960;
const JPEG_QUALITY = 0.82;

let deck: LoadedDeck | null = null;
let queue: number[] = [];
let running = false;

async function renderThumb(d: LoadedDeck, index: number): Promise<Uint8Array | null> {
  const size = d.pages[index];
  if (!size) return null;
  // 세로로 긴 장(A4 세로 등)은 높이 기준으로 줄인다
  const width = size.w >= size.h ? THUMB_BOX : Math.round((THUMB_BOX * size.w) / size.h);
  const bmp = await d.bitmap(index, width);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  return new Uint8Array(await blob.arrayBuffer());
}

async function pump() {
  if (running) return;
  running = true;
  while (deck && queue.length) {
    const d = deck;
    const index = queue.shift()!;
    let jpeg: Uint8Array | null = null;
    try {
      jpeg = await renderThumb(d, index);
    } catch {
      jpeg = null;
    }
    if (d === deck) window.pointer.worker.thumbDone(d.id, index, jpeg);
    // 썸네일 그리는 동안 다른 요청(장 크기 계산 등)이 끼어들 틈을 준다
    await new Promise((r) => setTimeout(r, 0));
  }
  running = false;
}

window.pointer.worker.onLoad(async ({ reqId, source, password }) => {
  deck?.destroy();
  deck = null;
  queue = [];
  const r = await loadDeck(source, password);
  if (!r.ok) {
    window.pointer.worker.loaded({ reqId, ok: false, reason: r.reason });
    return;
  }
  deck = r.deck;
  window.pointer.worker.loaded({ reqId, ok: true, pages: r.deck.pages });
  queue = r.deck.pages.map((_, i) => i);
  void pump();
});

window.pointer.worker.onThumbRequest(({ deckId, index }) => {
  if (!deck || deck.id !== deckId || index >= deck.pages.length) {
    window.pointer.worker.thumbDone(deckId, index, null);
    return;
  }
  // 이미 그린 장은 큐에 없다. main 이 다시 달라는 건 놓쳤다는 뜻이니 맨 앞에 다시 넣는다.
  queue = [index, ...queue.filter((i) => i !== index)];
  void pump();
});

// AI 가 장 글자를 달라고 하면 (MCP read_slides)
window.pointer.worker.onTextRequest(async ({ reqId, deckId, index }) => {
  if (!deck || deck.id !== deckId || index >= deck.pages.length) {
    window.pointer.worker.textDone(reqId, null);
    return;
  }
  try {
    window.pointer.worker.textDone(reqId, await deck.text(index));
  } catch {
    window.pointer.worker.textDone(reqId, null);
  }
});
