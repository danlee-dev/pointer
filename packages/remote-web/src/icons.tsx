// 24px 선 아이콘. 색은 currentColor 를 따른다.

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const LaserIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
);

export const SpotlightIcon = () => (
  <svg {...base}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill="currentColor" fillOpacity="0.28" stroke="none" />
    <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
  </svg>
);

export const MagnifyIcon = () => (
  <svg {...base}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 21 21M8 10.5h5M10.5 8v5" />
  </svg>
);

export const PenIcon = () => (
  <svg {...base}>
    <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L8.5 19 4 20z" />
    <path d="M13.5 7l3.5 3.5" />
  </svg>
);

export const MoreIcon = () => (
  <svg {...base}>
    <circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...base}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
