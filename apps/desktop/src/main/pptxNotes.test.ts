import { readFileSync } from 'node:fs';
import path from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { extractPptxNotes, notesText } from './pptxNotes';

const fixture = (name: string) => new Uint8Array(readFileSync(path.join(__dirname, '../../test-fixtures', name)));

function notesSlide(...paras: string[]) {
  return `<p:notes><p:cSld><p:spTree>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr></p:sp>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:txBody>
      ${paras.map((p) => `<a:p><a:r><a:t>${p}</a:t></a:r></a:p>`).join('')}
    </p:txBody></p:sp>
    <p:sp><p:nvSpPr><p:nvPr><p:ph type="sldNum" idx="2"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>1</a:t></a:r></a:p></p:txBody></p:sp>
  </p:spTree></p:cSld></p:notes>`;
}

/** 장 순서를 파일 이름 순서와 다르게 섞어서, sldIdLst 순서를 따르는지 확인한다 */
function makePptx() {
  const rels = (items: [string, string, string][]) =>
    `<Relationships>${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="http://x/${type}" Target="${target}"/>`).join('')}</Relationships>`;
  return zipSync({
    'ppt/presentation.xml': strToU8('<p:presentation><p:sldIdLst><p:sldId id="1" r:id="rA"/><p:sldId id="2" r:id="rB"/><p:sldId id="3" r:id="rC"/></p:sldIdLst></p:presentation>'),
    'ppt/_rels/presentation.xml.rels': strToU8(rels([['rA', 'slide', 'slides/slide3.xml'], ['rB', 'slide', 'slides/slide1.xml'], ['rC', 'slide', 'slides/slide2.xml']])),
    'ppt/slides/slide3.xml': strToU8('<p:sld></p:sld>'),
    'ppt/slides/slide1.xml': strToU8('<p:sld show="0"></p:sld>'),
    'ppt/slides/slide2.xml': strToU8('<p:sld></p:sld>'),
    'ppt/slides/_rels/slide3.xml.rels': strToU8(rels([['r1', 'notesSlide', '../notesSlides/notesSlide9.xml']])),
    'ppt/slides/_rels/slide1.xml.rels': strToU8(rels([['r1', 'notesSlide', '../notesSlides/notesSlide1.xml']])),
    'ppt/notesSlides/notesSlide9.xml': strToU8(notesSlide('첫 장', '둘째 줄 &amp; &lt;태그&gt;')),
    'ppt/notesSlides/notesSlide1.xml': strToU8(notesSlide('숨긴 장')),
  });
}

describe('extractPptxNotes', () => {
  it('장 순서를 따르고, 숨긴 장은 빼고, 노트 없는 장은 빈 칸', () => {
    expect(extractPptxNotes(makePptx())).toEqual(['첫 장\n둘째 줄 & <태그>', '']);
  });

  it('PowerPoint 가 저장한 실제 파일 (숨긴 장 1개, 노트 없는 장 1개)', () => {
    expect(extractPptxNotes(fixture('notes-hidden.pptx'))).toEqual([
      '인사하고 오늘 다룰 세 가지를 말한다.\n두 번째 줄 메모.',
      '결과 숫자를 강조. & < > 특수문자 확인',
      '',
    ]);
  });

  it('zip 이 아니면 null', () => {
    expect(extractPptxNotes(strToU8('not a zip'))).toBeNull();
  });
});

describe('notesText', () => {
  it('본문 자리만 읽고 줄바꿈 태그를 살린다', () => {
    const xml = notesSlide('a').replace('<a:t>a</a:t>', '<a:t>a</a:t></a:r><a:br/><a:r><a:t>b</a:t>');
    expect(notesText(xml)).toBe('a\nb');
  });
});
