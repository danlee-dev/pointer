// 머리글·바닥글처럼 모든 페이지에 나오는 문구

import { site } from '../site';

const ko = {
  htmlLang: 'ko',
  ogLocale: 'ko_KR',
  skip: '본문으로 건너뛰기',
  nav: { features: '기능', support: '지원', home: `${site.name} 홈` },
  switchTo: 'English',
  switchLabel: '영어로 보기',
  tagline: '폰으로 넘기고, 가리키고, 발표에만 집중한다.',
  footer: {
    privacy: '개인정보 처리방침',
    support: '지원',
    github: 'GitHub',
    language: '언어',
    // CC BY 4.0: 만든 사람, 원본, 라이선스, 바꾼 점을 밝힌다
    credit: { before: '아이폰 3D 모델', by: 'polyman', license: 'CC BY 4.0', change: '화면을 바꿔 렌더링' },
  },
};

export type CommonCopy = typeof ko;

const en: CommonCopy = {
  htmlLang: 'en',
  ogLocale: 'en_US',
  skip: 'Skip to content',
  nav: { features: 'Features', support: 'Support', home: `${site.name} home` },
  switchTo: '한국어',
  switchLabel: 'View in Korean',
  tagline: 'Present from your phone. Point at anything.',
  footer: {
    privacy: 'Privacy',
    support: 'Support',
    github: 'GitHub',
    language: 'Language',
    credit: { before: 'iPhone 3D model', by: 'polyman', license: 'CC BY 4.0', change: 'rendered with a new screen' },
  },
};

export const common: Record<'ko' | 'en', CommonCopy> = { ko, en };
