// 홈페이지 설정은 여기 한 곳에만 둔다.
// 이름이 바뀌거나 다운로드 링크가 생기면 이 파일의 값만 고친다. null 이면 화면에 "준비 중" 으로 나온다.

export const site = {
  /** 제품 이름 (임시). 문구 안의 이름도 전부 여기서 가져간다 */
  name: 'pointer',
  /** 정식 주소. 도메인이 정해지면 적는다. null 이면 Vercel 이 준 주소, 그것도 없으면 로컬 주소를 쓴다 */
  url: null as string | null,
  downloads: {
    mac: 'https://github.com/danlee-dev/pointer/releases/latest/download/pointer-mac.dmg' as string | null,
    windows: 'https://github.com/danlee-dev/pointer/releases/latest/download/pointer-windows-setup.exe' as string | null,
  },
  appStore: null as string | null,
  github: 'https://github.com/danlee-dev/pointer',
  /** 문의 창구. 개인 연락처는 두지 않는다 */
  support: 'https://github.com/danlee-dev/pointer/issues',
  /** 개인정보 처리방침 시행일 */
  privacyEffective: '2026-10-12',
};

export type Lang = 'ko' | 'en';

/** 같은 페이지의 다른 언어 주소. '/privacy' -> '/en/privacy' */
export function localePath(lang: Lang, path: '/' | '/privacy' | '/support'): string {
  if (lang === 'ko') return path;
  return path === '/' ? '/en/' : `/en${path}`;
}
