// pointer 로고를 한 곳에서 만든다. 결과는 brand/logo/*.svg, *.png
//   node brand/scripts/build-logo.mjs <opentype.js 와 @fontsource/instrument-serif, @resvg/resvg-js 가 있는 node_modules 경로>
//
// 아이디어: "pointer" 의 i 점이 레이저 점이다. 점 옆으로 짧게 휘어 들어오는 꼬리는
// 손으로 가리키며 움직인 흔적. 꼬리와 점 위치를 일부러 조금 비대칭으로 둔다.
// 글자는 Instrument Serif (OFL). 본문 글꼴(Pretendard)과 다른 에디토리얼 세리프.
// 글꼴이 없는 환경에서도 똑같이 보이게 글자를 전부 path 로 바꿔 넣는다.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const toolsDir = process.argv[2];
if (!toolsDir) throw new Error('usage: node build-logo.mjs <node_modules dir>');
const require = createRequire(path.join(toolsDir, 'x.js'));
const opentype = require('opentype.js');
const { Resvg } = require('@resvg/resvg-js');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'logo');
fs.mkdirSync(path.join(out, 'png'), { recursive: true });

const fontDir = path.join(toolsDir, '@fontsource/instrument-serif/files');
const latin = opentype.parse(fs.readFileSync(path.join(fontDir, 'instrument-serif-latin-400-normal.woff')).buffer);
const ext = opentype.parse(fs.readFileSync(path.join(fontDir, 'instrument-serif-latin-ext-400-normal.woff')).buffer);

const INK = '#0c0a09';
const PAPER = '#fafaf9';
const LASER = '#ff3b30';

// ---------- 워드마크 ----------

const SIZE = 100;
const TRACKING = -0.012 * SIZE; // 디스플레이 세리프는 살짝 붙인다

function glyphFor(ch) {
  const g = latin.charToGlyph(ch);
  if (g && g.index !== 0) return { font: latin, glyph: g };
  return { font: ext, glyph: ext.charToGlyph(ch) };
}

/** "pointer" 를 그리되 i 는 점 없는 ı 로 */
function layout() {
  const chars = ['p', 'o', 'ı', 'n', 't', 'e', 'r'];
  let x = 0;
  const parts = [];
  let iBox = null;
  let prev = null;
  let top = 0;
  let bottom = 0;
  for (const ch of chars) {
    const { font, glyph } = glyphFor(ch);
    if (prev && prev.font === font) x += (font.getKerningValue(prev.glyph, glyph) / font.unitsPerEm) * SIZE;
    const p = glyph.getPath(x, 0, SIZE);
    parts.push(p.toPathData(2));
    const bb = p.getBoundingBox();
    top = Math.min(top, bb.y1);
    bottom = Math.max(bottom, bb.y2);
    if (ch === 'ı') iBox = bb;
    x += (glyph.advanceWidth / font.unitsPerEm) * SIZE + TRACKING;
    prev = { font, glyph };
  }
  return { d: parts.join(''), width: x - TRACKING, iBox, top, bottom };
}

const word = layout();
// 원래 i 의 점 크기를 기준으로 레이저 점 크기를 정한다
const iGlyph = latin.charToGlyph('i').getPath(0, 0, SIZE);
const iFull = iGlyph.getBoundingBox();
const stem = word.iBox;
// 레이저 점은 원래 i 점 크기에 맞춘다. 너무 크면 만화처럼 보인다
const dotR = (stem.x2 - stem.x1) * 0.5;
// 점은 원래 i 점 자리에서 아주 조금 오른쪽 위 (가리키는 방향으로 기운 느낌)
const dot = { x: (stem.x1 + stem.x2) / 2 + dotR * 0.12, y: iFull.y1 + dotR * 0.9 };

/** 점으로 휘어 들어오는 꼬리: 시작은 가늘고 점 쪽이 굵다 */
function trail(cx, cy, r, len, lift) {
  const sx = cx - len;
  const sy = cy + lift;
  const c1x = cx - len * 0.45;
  const c1y = cy + lift * 0.1;
  // 위쪽 선과 아래쪽 선을 따로 그려서 두께가 점점 굵어지게
  const top = `M${sx.toFixed(2)},${sy.toFixed(2)} Q${c1x.toFixed(2)},${(c1y - r * 0.55).toFixed(2)} ${cx.toFixed(2)},${(cy - r * 0.62).toFixed(2)}`;
  const bottom = `L${cx.toFixed(2)},${(cy + r * 0.62).toFixed(2)} Q${(c1x + r * 0.2).toFixed(2)},${(c1y + r * 0.5).toFixed(2)} ${(sx + 0.6).toFixed(2)},${(sy + 0.7).toFixed(2)} Z`;
  return top + ' ' + bottom;
}

const xHeight = ((latin.tables.os2.sxHeight || latin.unitsPerEm * 0.45) / latin.unitsPerEm) * SIZE;

/**
 * centered: 상자의 세로 가운데가 소문자 몸통(x-height)의 가운데에 오게 한다.
 * 제목 줄처럼 다른 요소와 가운데 맞춤할 때 눈으로 보이는 글자가 가운데 온다
 * (점 위 여백과 p 의 아래 획까지 상자에 넣고 가운데 맞추면 글자가 아래로 처져 보인다).
 */
function wordmarkSvg({ text, dotColor, halo, trailOn, centered = false }) {
  const pad = 6;
  // 번짐(halo)이 있을 때만 점 위로 여유를 크게 둔다
  let top = Math.min(dot.y - dotR * (halo ? 3.2 : 1.3), word.top) - pad;
  let h = word.bottom - top + pad;
  if (centered) {
    const mid = -xHeight / 2;
    const half = Math.max(mid - top, word.bottom + pad - mid);
    top = mid - half;
    h = half * 2;
  }
  const w = word.width + pad * 2;
  const vb = `${(-pad).toFixed(1)} ${top.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
  // 꼬리는 짧고 높게: o 위를 지나가지 않고 i 위에서 끝난다
  const trailPath = trail(dot.x, dot.y, dotR, dotR * 3.4, dotR * 0.9);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="pointer">
${halo ? `<defs><radialGradient id="h"><stop offset="0" stop-color="${LASER}" stop-opacity=".28"/><stop offset="1" stop-color="${LASER}" stop-opacity="0"/></radialGradient>
<linearGradient id="t" x1="0" x2="1"><stop offset="0" stop-color="${dotColor}" stop-opacity="0"/><stop offset="1" stop-color="${dotColor}" stop-opacity=".4"/></linearGradient></defs>
<circle cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${(dotR * 2.4).toFixed(2)}" fill="url(#h)"/>` : ''}
${trailOn ? `<path d="${trailPath}" fill="${halo ? 'url(#t)' : dotColor}"${halo ? '' : ' opacity=".45"'}/>` : ''}
<path d="${word.d}" fill="${text}"/>
<circle cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${dotR.toFixed(2)}" fill="${dotColor}"/>
</svg>
`;
}

// ---------- 아이콘 ----------

/** Apple 아이콘처럼 모서리 곡률이 서서히 바뀌는 초타원(superellipse) */
function squircle(cx, cy, half, n = 5, steps = 96) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    pts.push([cx + half * Math.sign(c) * Math.abs(c) ** (2 / n), cy + half * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L') + 'Z';
}

/**
 * 1024 캔버스 아이콘: 어두운 판 위에 밝은 슬라이드, 그 위에 레이저 점.
 * 빨간 점만 있으면 작은 크기에서 "녹화" 버튼으로 읽힌다. 슬라이드가 있어야 "발표" 로 읽힌다.
 *  shape: 'mac' 은 Apple 아이콘 격자(824 크기), 'full' 은 꽉 찬 정사각 (iOS·안드로이드가 알아서 깎는다)
 *  small: 32px 이하용. 슬라이드 속 글줄과 꼬리를 빼고 점을 키운다
 */
function iconSvg({ shape, small = false }) {
  const S = 1024;
  const c = S / 2;
  const half = shape === 'mac' ? 412 : 512;
  const bg = shape === 'mac' ? squircle(c, c, half) : `M0,0H${S}V${S}H0Z`;
  // 슬라이드: 16:10, 가운데보다 살짝 위
  const sw = shape === 'mac' ? (small ? 600 : 580) : 700;
  const sh = Math.round((sw * 10) / 16);
  const sx = c - sw / 2;
  const sy = c - sh / 2 - (small ? 0 : 24);
  const r = small ? 78 : 50;
  const dx = sx + sw * 0.7;
  const dy = sy + sh * (small ? 0.5 : 0.44);
  const lines = small
    ? ''
    : `<rect x="${sx + sw * 0.1}" y="${sy + sh * 0.2}" width="${sw * 0.42}" height="${sh * 0.075}" rx="${sh * 0.0375}" fill="#d6d3d1"/>
<rect x="${sx + sw * 0.1}" y="${sy + sh * 0.36}" width="${sw * 0.3}" height="${sh * 0.06}" rx="${sh * 0.03}" fill="#e7e5e4"/>
<rect x="${sx + sw * 0.1}" y="${sy + sh * 0.68}" width="${sw * 0.8}" height="${sh * 0.06}" rx="${sh * 0.03}" fill="#e7e5e4"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
<defs>
<radialGradient id="glow"><stop offset="0" stop-color="${LASER}" stop-opacity=".45"/><stop offset=".5" stop-color="${LASER}" stop-opacity=".12"/><stop offset="1" stop-color="${LASER}" stop-opacity="0"/></radialGradient>
<linearGradient id="tr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${LASER}" stop-opacity="0"/><stop offset="1" stop-color="${LASER}" stop-opacity=".6"/></linearGradient>
<radialGradient id="core" cx=".42" cy=".4" r=".62"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#ff8a80"/><stop offset=".72" stop-color="${LASER}"/></radialGradient>
</defs>
<path d="${bg}" fill="${INK}"/>
<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${small ? 44 : 36}" fill="${PAPER}"/>
${lines}
<circle cx="${dx}" cy="${dy}" r="${r * 2.8}" fill="url(#glow)"/>
${small ? '' : `<path d="${trail(dx, dy, r, r * 5, r * 2.4)}" fill="url(#tr)"/>`}
<circle cx="${dx}" cy="${dy}" r="${r}" fill="url(#core)"/>
</svg>
`;
}

/** 한 색 아이콘 (메뉴 막대, 인쇄). 배경 없음 */
function iconMonoSvg(color) {
  const S = 1024;
  const c = S / 2;
  const r = 150;
  const dx = c + 120;
  const dy = c - 80;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
<path d="${trail(dx, dy, r, r * 4, r * 2.4)}" fill="${color}" opacity=".45"/>
<circle cx="${dx}" cy="${dy}" r="${r}" fill="${color}"/>
</svg>
`;
}

// ---------- 쓰기 ----------

const files = {
  'full-color.svg': wordmarkSvg({ text: INK, dotColor: LASER, halo: true, trailOn: true }),
  'full-reverse.svg': wordmarkSvg({ text: PAPER, dotColor: LASER, halo: true, trailOn: true }),
  'full-mono.svg': wordmarkSvg({ text: 'currentColor', dotColor: 'currentColor', halo: false, trailOn: false }),
  // 앱 화면 안에서 쓰는 것: 글자는 테마 글자색을 따르고 점만 빨강
  'full-ui.svg': wordmarkSvg({ text: 'currentColor', dotColor: LASER, halo: false, trailOn: true, centered: true }),
  'icon.svg': iconSvg({ shape: 'mac' }),
  'icon-full.svg': iconSvg({ shape: 'full' }),
  'icon-small.svg': iconSvg({ shape: 'mac', small: true }),
  'icon-mono.svg': iconMonoSvg('currentColor'),
  'avatar.svg': iconSvg({ shape: 'full' }),
};
for (const [name, svg] of Object.entries(files)) fs.writeFileSync(path.join(out, name), svg);

function png(svgName, width, outName, fillCurrent = INK) {
  const svg = fs.readFileSync(path.join(out, svgName), 'utf8').replaceAll('currentColor', fillCurrent);
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  fs.writeFileSync(path.join(out, 'png', outName), r.render().asPng());
}

png('icon.svg', 1024, 'icon-1024.png');
png('icon-full.svg', 1024, 'icon-full-1024.png');
for (const s of [16, 24, 32, 48, 64]) png('icon-small.svg', s, `icon-${s}.png`);
for (const s of [128, 256, 512]) png('icon.svg', s, `icon-${s}.png`);
png('full-color.svg', 1200, 'full-color@3x.png');
png('full-reverse.svg', 1200, 'full-reverse@3x.png');
png('icon-mono.svg', 64, 'icon-mono-64.png');
png('icon-full.svg', 180, 'apple-touch-icon.png');

console.log('> brand/logo:', Object.keys(files).join(', '));
console.log('  dot', dot, 'dotR', dotR.toFixed(2), 'width', word.width.toFixed(1));
