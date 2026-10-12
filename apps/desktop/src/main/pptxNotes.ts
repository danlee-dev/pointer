// PPTX 안의 발표자 노트를 장 순서대로 꺼낸다.
// PPTX 는 zip 안에 XML 이 든 파일이다. 필요한 길은 이렇다.
//   ppt/presentation.xml            장 순서 (sldIdLst 의 r:id)
//   ppt/_rels/presentation.xml.rels r:id -> slides/slideN.xml
//   ppt/slides/slideN.xml           show="0" 이면 숨긴 장 (PDF 로 내보낼 때 빠진다)
//   ppt/slides/_rels/slideN.xml.rels -> ../notesSlides/notesSlideM.xml
//   notesSlideM.xml                 본문 자리(ph type="body") 의 글자가 노트
// 숨긴 장은 결과에서 뺀다. 그래야 PDF 의 장 번호와 노트 번호가 맞는다.

import { unzipSync, strFromU8 } from 'fflate';

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');

/** "ppt/slides" 기준 "../notesSlides/x.xml" 같은 상대 경로를 zip 안 경로로 */
function resolve(baseDir: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = baseDir.split('/').filter(Boolean);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function relationships(xml: string | undefined): Map<string, { type: string; target: string }> {
  const map = new Map<string, { type: string; target: string }>();
  if (!xml) return map;
  for (const m of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = m[1]!;
    const id = attrs.match(/\bId="([^"]+)"/)?.[1];
    const type = attrs.match(/\bType="([^"]+)"/)?.[1];
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && type && target) map.set(id, { type, target });
  }
  return map;
}

/** 노트 장 XML 에서 본문 자리의 글자만. 문단은 줄바꿈으로 잇는다 */
export function notesText(xml: string): string {
  for (const sp of xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) ?? []) {
    if (!/<p:ph\b[^>]*\btype="body"/.test(sp)) continue;
    const paras = (sp.match(/<a:p>[\s\S]*?<\/a:p>|<a:p\/>/g) ?? []).map((p) =>
      (p.match(/<a:t>([\s\S]*?)<\/a:t>|<a:br\/>/g) ?? [])
        .map((t) => (t === '<a:br/>' ? '\n' : decode(t.replace(/^<a:t>|<\/a:t>$/g, ''))))
        .join(''),
    );
    return paras.join('\n').replace(/\n+$/, '').trim();
  }
  return '';
}

/**
 * 보이는 장(숨기지 않은 장)마다 노트 하나씩. 노트가 없는 장은 빈 문자열.
 * PPTX 가 아니거나 구조를 못 읽으면 null.
 */
export function extractPptxNotes(bytes: Uint8Array): string[] | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      // 필요한 XML 만 푼다 (그림·영상은 건너뛴다)
      filter: (f) => f.name.startsWith('ppt/') && (f.name.endsWith('.xml') || f.name.endsWith('.rels')),
    });
  } catch {
    return null;
  }
  const text = (name: string) => (files[name] ? strFromU8(files[name]!) : undefined);

  const pres = text('ppt/presentation.xml');
  if (!pres) return null;
  const presRels = relationships(text('ppt/_rels/presentation.xml.rels'));
  const order = [...pres.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)].map((m) => m[1]!);

  const out: string[] = [];
  for (const rid of order) {
    const rel = presRels.get(rid);
    if (!rel) continue;
    const slidePath = resolve('ppt', rel.target);
    const slide = text(slidePath);
    if (!slide) continue;
    // 숨긴 장: <p:sld ... show="0">
    if (/<p:sld\b[^>]*\bshow="(0|false)"/.test(slide)) continue;

    const dir = slidePath.slice(0, slidePath.lastIndexOf('/'));
    const file = slidePath.slice(slidePath.lastIndexOf('/') + 1);
    const slideRels = relationships(text(`${dir}/_rels/${file}.rels`));
    const notesRel = [...slideRels.values()].find((r) => r.type.endsWith('/notesSlide'));
    const notesXml = notesRel ? text(resolve(dir, notesRel.target)) : undefined;
    out.push(notesXml ? notesText(notesXml) : '');
  }
  return out;
}
