// 공유 미리보기 이미지(Open Graph, 1200x630)를 만든다. 결과: apps/site/public/og.png, og-en.png
//   node apps/site/scripts/build-og.mjs <@resvg/resvg-js 가 있는 node_modules 경로>
// resvg 는 사이트 의존성이 아니라서 brand/scripts/build-logo.mjs 처럼 밖에 설치한 것을 쓴다.
// 문구는 src/i18n/landing.ts 의 hero 와 맞춘다. 로고는 brand/logo/full-color.svg 를 그대로 넣는다.
// 색은 DESIGN.md 의 라이트 토큰 값이다 (이미지 안이라 CSS 변수를 못 쓴다).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const toolsDir = process.argv[2];
if (!toolsDir) throw new Error('usage: node build-og.mjs <node_modules dir>');
const require = createRequire(path.join(toolsDir, 'x.js'));
const { Resvg } = require('@resvg/resvg-js');

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(here, '..');
const repo = path.join(site, '..', '..');
const fontDir = path.join(repo, 'node_modules/pretendard/dist/public/static');

const C = {
  bg: '#f5f5f4',
  raised: '#ffffff',
  ink: '#0c0a09',
  muted: '#6b655f',
  paper: '#fafaf9',
  soft: '#e7e5e4',
  stone: '#1c1917',
  stoneEdge: '#44403c',
  laser: '#ff3b30',
  mint: '#a7e5d3',
  peach: '#f4c5a8',
  lavender: '#c8b8e0',
  sky: '#a8c8e8',
};

const logoRaw = fs.readFileSync(path.join(repo, 'brand/logo/full-color.svg'), 'utf8');
const logoBox = logoRaw.match(/viewBox="([^"]+)"/)[1];
const logoInner = logoRaw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const COPY = {
  ko: { lines: ['폰으로 넘기고,', '가리키고.'], sub: ['QR 코드 한 번이면 손에 든 폰이', '리모컨이자 레이저 포인터가 됩니다.'], size: 96, top: 236 },
  en: { lines: ['Present from', 'your phone.', 'Point at anything.'], sub: ['Scan one QR code and your phone', 'becomes the clicker and the laser.'], size: 70, top: 214 },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svg(lang) {
  const t = COPY[lang];
  const lh = t.size * 1.12;
  const top = t.top;
  const bars = [44, 58, 72, 96, 124, 168];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46"/></filter>
    <radialGradient id="laser"><stop offset="0" stop-color="#fff"/><stop offset="0.22" stop-color="#ff8a80"/><stop offset="0.5" stop-color="${C.laser}"/><stop offset="1" stop-color="${C.laser}" stop-opacity="0"/></radialGradient>
    <linearGradient id="trail" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${C.laser}" stop-opacity="0"/><stop offset="1" stop-color="${C.laser}" stop-opacity="0.5"/></linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="${C.ink}" flood-opacity="0.16"/></filter>
  </defs>
  <rect width="1200" height="630" fill="${C.bg}"/>
  <g filter="url(#blur)" opacity="0.9">
    <circle cx="1020" cy="120" r="170" fill="${C.mint}"/>
    <circle cx="1130" cy="430" r="150" fill="${C.lavender}"/>
    <ellipse cx="820" cy="600" rx="230" ry="120" fill="${C.peach}"/>
  </g>

  <svg x="64" y="52" width="150" height="75" viewBox="${logoBox}">${logoInner}</svg>

  ${t.lines
    .map(
      (l, i) =>
        `<text x="72" y="${top + i * lh}" font-family="Pretendard" font-weight="300" font-size="${t.size}" letter-spacing="${-t.size * 0.035}" fill="${C.ink}">${esc(l)}</text>`,
    )
    .join('\n  ')}
  ${t.sub
    .map(
      (l, i) =>
        `<text x="74" y="${top + (t.lines.length - 1) * lh + 76 + i * 36}" font-family="Pretendard" font-weight="400" font-size="26" fill="${C.muted}">${esc(l)}</text>`,
    )
    .join('\n  ')}

  <g filter="url(#shadow)">
    <rect x="${lang === 'ko' ? 700 : 760}" y="186" width="400" height="236" rx="22" fill="${C.stone}"/>
  </g>
  <g transform="translate(${lang === 'ko' ? 700 : 760} 186)">
    <rect x="10" y="10" width="380" height="216" rx="13" fill="${C.paper}"/>
    <rect x="40" y="40" width="120" height="12" rx="6" fill="${C.ink}"/>
    ${bars
      .map((h, i) => `<rect x="${44 + i * 54}" y="${200 - h}" width="38" height="${h}" rx="4" fill="${i === bars.length - 1 ? C.ink : C.soft}"/>`)
      .join('\n    ')}
    <path d="M232 118 Q290 66 333 30" stroke="url(#trail)" stroke-width="9" stroke-linecap="round" fill="none"/>
    <circle cx="333" cy="30" r="24" fill="url(#laser)"/>
  </g>
  <g filter="url(#shadow)">
    <rect x="${lang === 'ko' ? 1010 : 1060}" y="330" width="150" height="300" rx="34" fill="${C.stone}"/>
  </g>
  <g transform="translate(${lang === 'ko' ? 1010 : 1060} 330)">
    <rect x="7" y="7" width="136" height="300" rx="28" fill="${C.ink}"/>
    <rect x="52" y="17" width="46" height="12" rx="6" fill="#000"/>
    <rect x="17" y="50" width="116" height="65" rx="9" fill="${C.paper}"/>
    ${bars
      .map((h, i) => `<rect x="${25 + i * 17}" y="${107 - h * 0.3}" width="12" height="${h * 0.3}" rx="1.5" fill="${i === bars.length - 1 ? C.ink : C.soft}"/>`)
      .join('\n    ')}
    <circle cx="117" cy="56" r="9" fill="url(#laser)"/>
    <rect x="17" y="126" width="116" height="34" rx="11" fill="${C.stone}"/>
    <rect x="17" y="170" width="36" height="120" rx="14" fill="${C.stone}"/>
    <rect x="59" y="170" width="74" height="120" rx="14" fill="#292524"/>
  </g>
</svg>`;
}

const fontFiles = ['Pretendard-Light.otf', 'Pretendard-Regular.otf'].map((f) => path.join(fontDir, f));
for (const lang of ['ko', 'en']) {
  const out = path.join(site, 'public', lang === 'ko' ? 'og.png' : 'og-en.png');
  const png = new Resvg(svg(lang), {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Pretendard' },
  })
    .render()
    .asPng();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, png);
  console.log(out, png.length);
}
