// 사용자가 고른 파일·폴더를 "자료" 하나로 정리한다.
//   PDF 한 개            -> pdf 자료
//   이미지 여러 장 / 폴더 -> images 자료 (파일 이름 순서, 2 가 10 보다 앞)
// 실제 파일 경로는 main 에만 두고, 렌더러에는 id 와 순번으로만 읽게 한다.

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { DeckSource } from '../shared/ipc';

export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif'];
const isPdf = (p: string) => path.extname(p).toLowerCase() === '.pdf';
const isImage = (p: string) => IMAGE_EXT.includes(path.extname(p).toLowerCase());

const naturalSort = (a: string, b: string) =>
  path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: 'base' });

export interface OpenedDeck {
  source: DeckSource;
  /** 렌더러가 readFile(deckId, n) 으로 읽는 실제 파일들 */
  files: string[];
  /** 최근 목록에 남길 원래 선택 (폴더면 폴더 경로) */
  picked: string[];
}

export type InspectError = 'mixed' | 'unsupported' | 'noImages' | 'open';

export async function inspectPaths(picked: string[]): Promise<OpenedDeck | InspectError> {
  const files: string[] = [];
  try {
    for (const p of picked) {
      const st = await fs.stat(p);
      if (st.isDirectory()) {
        const names = await fs.readdir(p);
        const imgs = names.filter((n) => !n.startsWith('.') && isImage(n)).map((n) => path.join(p, n));
        if (imgs.length === 0 && picked.length === 1) return 'noImages';
        files.push(...imgs);
      } else {
        files.push(p);
      }
    }
  } catch {
    return 'open';
  }

  const pdfs = files.filter(isPdf);
  const images = files.filter(isImage);

  if (pdfs.length === 1 && images.length === 0 && files.length === 1) {
    const file = pdfs[0]!;
    const buf = await fs.readFile(file).catch(() => null);
    if (!buf) return 'open';
    const id = createHash('sha1').update(buf).digest('hex').slice(0, 16);
    return {
      source: { id, kind: 'pdf', title: path.basename(file, path.extname(file)), files: [path.basename(file)] },
      files: [file],
      picked,
    };
  }

  // PDF 여러 개, 또는 PDF + 이미지
  if (pdfs.length > 0) return 'mixed';
  if (images.length === 0 || images.length !== files.length) return 'unsupported';

  images.sort(naturalSort);
  // 이미지 묶음은 내용 전체를 해시하면 느리다. 경로·크기·수정 시각이면 충분히 구분된다.
  const h = createHash('sha1');
  for (const f of images) {
    const st = await fs.stat(f);
    h.update(`${f}:${st.size}:${st.mtimeMs}\n`);
  }
  const folder = picked.length === 1 && images.length > 1 ? path.basename(picked[0]!) : null;
  const first = path.basename(images[0]!, path.extname(images[0]!));
  return {
    source: {
      id: h.digest('hex').slice(0, 16),
      kind: 'images',
      title: folder ?? first,
      files: images.map((f) => path.basename(f)),
    },
    files: images,
    picked,
  };
}
