// PDF·이미지 자료를 "장 n 을 폭 w 픽셀로 그린 그림" 으로 바꿔 주는 공통 로더.
// 청중 화면, 발표자 화면, 숨은 썸네일 창이 모두 이걸 쓴다.

import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PageSize } from '@pointer/protocol';
import type { DeckSource } from '../../../shared/ipc';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// scripts/copy-pdfjs-assets.mjs 가 public/pdfjs 로 복사해 둔 파일들
const assets = new URL('pdfjs/', document.baseURI).href;

/** 한 장을 너무 크게 그리면 GPU 메모리가 터진다. 8K 폭, 3,200만 픽셀에서 자른다 */
const MAX_SIDE = 8192;
const MAX_AREA = 32_000_000;

export interface LoadedDeck {
  id: string;
  pages: PageSize[];
  /** index 장을 가로 width 픽셀로 그린 그림. 같은 요청은 캐시에서 준다 */
  bitmap(index: number, width: number): Promise<ImageBitmap>;
  /** 장에 들어 있는 글자 (AI 가 대본을 쓸 때 읽는다). 이미지 자료는 빈 문자열 */
  text(index: number): Promise<string>;
  destroy(): void;
}

export type LoadOutcome =
  | { ok: true; deck: LoadedDeck }
  | { ok: false; reason: 'password' | 'wrongPassword' | 'open' };

/** 폭을 64 단위로 올려서, 창 크기가 조금 바뀔 때마다 다시 그리지 않게 한다 */
export const quantize = (w: number) => Math.max(64, Math.ceil(w / 64) * 64);

function clampWidth(width: number, page: PageSize): number {
  const ratio = page.h / page.w;
  let w = Math.min(width, MAX_SIDE, MAX_SIDE / ratio);
  if (w * w * ratio > MAX_AREA) w = Math.sqrt(MAX_AREA / ratio);
  return Math.max(1, Math.floor(w));
}

/** 최근에 그린 그림 몇 장만 들고 있는다. 밀려난 그림은 GPU 메모리에서 바로 내린다 */
function lru(limit: number) {
  const map = new Map<string, Promise<ImageBitmap>>();
  return {
    get(key: string, make: () => Promise<ImageBitmap>): Promise<ImageBitmap> {
      const hit = map.get(key);
      if (hit) {
        map.delete(key);
        map.set(key, hit);
        return hit;
      }
      const p = make();
      map.set(key, p);
      p.catch(() => map.delete(key));
      while (map.size > limit) {
        const [oldKey, old] = map.entries().next().value as [string, Promise<ImageBitmap>];
        map.delete(oldKey);
        void old.then((b) => b.close(), () => {});
      }
      return p;
    },
    clear() {
      for (const p of map.values()) void p.then((b) => b.close(), () => {});
      map.clear();
    },
  };
}

export async function loadDeck(
  source: DeckSource,
  password: string | null,
  knownPages?: PageSize[],
): Promise<LoadOutcome> {
  return source.kind === 'pdf' ? loadPdf(source, password, knownPages) : loadImages(source, knownPages);
}

async function loadPdf(source: DeckSource, password: string | null, knownPages?: PageSize[]): Promise<LoadOutcome> {
  const data = await window.pointer.readFile(source.id, 0);
  if (!data) return { ok: false, reason: 'open' };

  const task = pdfjs.getDocument({
    data,
    password: password ?? undefined,
    cMapUrl: `${assets}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assets}standard_fonts/`,
    wasmUrl: `${assets}wasm/`,
    iccUrl: `${assets}iccs/`,
  });

  let doc: pdfjs.PDFDocumentProxy;
  try {
    doc = await task.promise;
  } catch (e) {
    if (e instanceof pdfjs.PasswordException) {
      const wrong = e.code === pdfjs.PasswordResponses.INCORRECT_PASSWORD;
      return { ok: false, reason: wrong ? 'wrongPassword' : 'password' };
    }
    return { ok: false, reason: 'open' };
  }

  let pages = knownPages;
  if (!pages || pages.length !== doc.numPages) {
    pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      // 회전이 들어간 장은 viewport 가 이미 돌려진 크기를 준다
      const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
      pages.push({ w: vp.width, h: vp.height });
    }
  }

  const cache = lru(12);
  const finalPages = pages;
  return {
    ok: true,
    deck: {
      id: source.id,
      pages: finalPages,
      bitmap(index, width) {
        const size = finalPages[index];
        if (!size) return Promise.reject(new Error('no page'));
        const w = clampWidth(width, size);
        return cache.get(`${index}@${w}`, async () => {
          const page = await doc.getPage(index + 1);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: w / base.width });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          // PDF 는 흰 종이를 가정한다. 투명 배경이면 검은 청중 화면에서 글자가 사라진다
          await page.render({ canvas, viewport, background: '#ffffff' }).promise;
          const bmp = await createImageBitmap(canvas);
          canvas.width = canvas.height = 0;
          return bmp;
        });
      },
      async text(index) {
        const page = await doc.getPage(index + 1);
        const content = await page.getTextContent();
        let out = '';
        for (const item of content.items) {
          if (!('str' in item)) continue;
          out += item.str;
          out += item.hasEOL ? '\n' : '';
        }
        return out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      },
      destroy() {
        cache.clear();
        // v6 부터 문서 정리는 loading task 쪽에서 한다
        void task.destroy();
      },
    },
  };
}

async function loadImages(source: DeckSource, knownPages?: PageSize[]): Promise<LoadOutcome> {
  const read = async (i: number) => {
    const bytes = await window.pointer.readFile(source.id, i);
    if (!bytes) throw new Error('read');
    return new Blob([bytes as BlobPart]);
  };

  let pages = knownPages;
  if (!pages || pages.length !== source.files.length) {
    pages = [];
    try {
      for (let i = 0; i < source.files.length; i++) {
        const bmp = await createImageBitmap(await read(i));
        pages.push({ w: bmp.width, h: bmp.height });
        bmp.close();
      }
    } catch {
      return { ok: false, reason: 'open' };
    }
  }

  const cache = lru(12);
  const finalPages = pages;
  return {
    ok: true,
    deck: {
      id: source.id,
      pages: finalPages,
      bitmap(index, width) {
        const size = finalPages[index];
        if (!size) return Promise.reject(new Error('no page'));
        const w = Math.min(clampWidth(width, size), size.w);
        return cache.get(`${index}@${w}`, async () =>
          createImageBitmap(await read(index), {
            resizeWidth: w,
            resizeHeight: Math.max(1, Math.round((w * size.h) / size.w)),
            resizeQuality: 'high',
          }),
        );
      },
      text: async () => '',
      destroy() {
        cache.clear();
      },
    },
  };
}
