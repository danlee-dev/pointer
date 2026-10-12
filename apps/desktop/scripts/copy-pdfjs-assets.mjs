// pdf.js 가 PDF 를 그릴 때 따로 읽어 오는 파일들을 렌더러 public 폴더로 복사한다.
//   cmaps          글꼴이 안 박힌 한글·중국어·일본어 PDF
//   standard_fonts 기본 14 글꼴이 안 박힌 PDF
//   wasm           JPEG2000·JBIG2 이미지가 든 PDF (스캔본에 흔하다)
//   iccs           색상 프로필
import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pdfjs = path.dirname(require.resolve('pdfjs-dist/package.json'));
const out = path.join(here, '../src/renderer/public/pdfjs');

mkdirSync(out, { recursive: true });
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(path.join(pdfjs, dir), path.join(out, dir), { recursive: true });
}
console.log('> pdf.js assets ->', path.relative(process.cwd(), out));
