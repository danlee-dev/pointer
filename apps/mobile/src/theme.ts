// DESIGN.md 의 토큰 (폰 리모컨은 어두운 테마 고정). 색은 여기서만 정의한다.
// iOS 의 borderCurve: 'continuous' 가 Apple 의 연속 곡선 모서리다 (웹의 corner-shape: squircle 과 같은 역할).

export const color = {
  bg: '#0c0a09',
  bgRaised: '#1c1917',
  surface: '#292524',
  surfaceHover: '#33302d',
  surfacePress: '#44403c',
  fg: '#fafaf9',
  fgMuted: '#a8a29e',
  fgSubtle: '#8a837d',
  primary: '#fafaf9',
  primaryFg: '#0c0a09',
  accentText: '#ff6b62',
  live: '#ff453a',
  ok: '#5fd49a',
  warn: '#f5b841',
  laser: '#ff3b30',
  scrim: 'rgba(12, 10, 9, 0.6)',
} as const;

export const pen = { red: '#ff3b30', yellow: '#ffd60a', blue: '#2f8bff', white: '#ffffff' } as const;

export const radius = { xl: 28, lg: 20, md: 14, sm: 8, pill: 999 } as const;

/** 둥근 모서리는 전부 연속 곡선으로 */
export const curve = { borderCurve: 'continuous' as const };

export const type = {
  caption: { fontSize: 13, lineHeight: 20 },
  body: { fontSize: 15, lineHeight: 24 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  section: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const, letterSpacing: -0.5 },
  display: { fontSize: 36, lineHeight: 40, fontWeight: '300' as const, letterSpacing: -1 },
};

export const ease = { duration: 150 };
