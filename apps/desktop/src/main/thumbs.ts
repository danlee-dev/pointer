// 장 썸네일 (폰 리모컨, 발표자 화면 아래 줄에서 씀).
// 그리는 일은 숨은 렌더 창(worker)이 pdf.js 로 하고, main 은 결과 JPEG 를 메모리에 들고 있는다.
// 아직 안 그린 장을 누가 달라고 하면 worker 에 "이것부터" 를 부탁하고 기다린다.

type Waiter = (buf: Buffer | null) => void;

const TIMEOUT_MS = 20_000;

export function createThumbCache(requestFromWorker: (deckId: string, index: number) => void) {
  let deckId: string | null = null;
  const done = new Map<number, Buffer | null>();
  const waiting = new Map<number, Waiter[]>();

  function settle(index: number, buf: Buffer | null) {
    done.set(index, buf);
    for (const w of waiting.get(index) ?? []) w(buf);
    waiting.delete(index);
  }

  return {
    /** 새 자료로 바뀌면 이전 것은 버린다 */
    reset(id: string | null) {
      deckId = id;
      done.clear();
      for (const ws of waiting.values()) for (const w of ws) w(null);
      waiting.clear();
    },
    put(id: string, index: number, buf: Buffer | null) {
      if (id === deckId) settle(index, buf);
    },
    get(id: string, index: number): Promise<Buffer | null> {
      if (id !== deckId) return Promise.resolve(null);
      if (done.has(index)) return Promise.resolve(done.get(index) ?? null);
      return new Promise((resolve) => {
        const list = waiting.get(index) ?? [];
        list.push(resolve);
        waiting.set(index, list);
        if (list.length === 1) requestFromWorker(id, index);
        setTimeout(() => {
          const cur = waiting.get(index);
          if (cur?.includes(resolve)) {
            waiting.set(index, cur.filter((w) => w !== resolve));
            resolve(null);
          }
        }, TIMEOUT_MS);
      });
    },
  };
}
