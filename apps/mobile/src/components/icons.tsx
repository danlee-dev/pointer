// 웹 리모컨과 같은 24px 선 아이콘 (react-native-svg)

import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import type { Cue } from '@pointer/protocol';

interface P {
  color: string;
  size?: number;
}

const stroke = (color: string) => ({ stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' });

export const LaserIcon = ({ color, size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="3" fill={color} />
    <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" {...stroke(color)} />
  </Svg>
);

export const SpotlightIcon = ({ color, size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="2.5" y="4.5" width="19" height="15" rx="2.5" fill={color} fillOpacity={0.28} />
    <Circle cx="12" cy="12" r="4.5" fill={color} />
  </Svg>
);

export const MagnifyIcon = ({ color, size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="10.5" cy="10.5" r="6.5" {...stroke(color)} />
    <Path d="M15.5 15.5 21 21M8 10.5h5M10.5 8v5" {...stroke(color)} />
  </Svg>
);

export const PenIcon = ({ color, size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L8.5 19 4 20z" {...stroke(color)} />
    <Path d="M13.5 7l3.5 3.5" {...stroke(color)} />
  </Svg>
);

/** 에어 포인터: 폰과 휘는 궤적 */
export const AirIcon = ({ color, size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="4" y="9" width="7" height="12" rx="1.8" {...stroke(color)} />
    <Path d="M9 6c3-3 8-3 11 1" {...stroke(color)} />
    <Circle cx="20" cy="7" r="1.6" fill={color} />
  </Svg>
);

export const MoreIcon = ({ color, size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="5.5" cy="12" r="1.6" fill={color} />
    <Circle cx="12" cy="12" r="1.6" fill={color} />
    <Circle cx="18.5" cy="12" r="1.6" fill={color} />
  </Svg>
);

export const CloseIcon = ({ color, size = 18 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 6l12 12M18 6L6 18" {...stroke(color)} strokeWidth={2.2} />
  </Svg>
);

export const CheckIcon = ({ color, size = 20 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke(color)} strokeWidth={2.2} />
  </Svg>
);

// ---------- 효과 (웹 리모컨 icons.tsx 와 같은 모양) ----------

export const SparkleIcon = ({ color, size = 22 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M10 3.5l1.6 4.4L16 9.5l-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6z" {...stroke(color)} />
    <Path d="M18 14.5l.8 2 2 .7-2 .8-.8 2-.7-2-2-.8 2-.7z" {...stroke(color)} />
  </Svg>
);

const thick = (color: string) => ({ ...stroke(color), strokeWidth: 2.4 });

export const CUE_ICONS: Record<Cue, (p: P) => React.JSX.Element> = {
  confetti: ({ color, size = 28 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20l4.5-11.5 7 7z" {...stroke(color)} />
      <Path d="M14 3.5v2.5M19 8.5h2.5M17 5l1.6-1.6M18.5 12.5l1.5.6M11 5.5l.6 1.5" {...stroke(color)} />
    </Svg>
  ),
  drumroll: ({ color, size = 28 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx="12" cy="11" rx="7.5" ry="2.6" {...stroke(color)} />
      <Path d="M4.5 11v5.2c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7V11" {...stroke(color)} />
      <Path d="M9.5 9.2L5.5 3.5M14.5 9.2l4-5.7" {...stroke(color)} />
    </Svg>
  ),
  applause: ({ color, size = 28 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8.5 20.5C6.3 19 5 16.6 5 13.6V9.8a1.4 1.4 0 0 1 2.8 0v2.4M7.8 12V6.6a1.4 1.4 0 0 1 2.8 0V11M10.6 10.5V5.5a1.4 1.4 0 0 1 2.8 0V11M13.4 11V7.4a1.4 1.4 0 0 1 2.8 0v6.2c0 4-2.5 7-6.2 7" {...stroke(color)} />
      <Path d="M18.5 3.5l-.8 1.8M21 7l-1.8.8" {...stroke(color)} />
    </Svg>
  ),
  fireworks: ({ color, size = 28 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3v2.5M12 12.5V15M7 8.5H4.5M19.5 8.5H17M8.5 5l-1.7-1.7M17.2 3.3 15.5 5M8.5 12l-1.7 1.7M17.2 13.7 15.5 12" {...stroke(color)} />
      <Path d="M12 17.5v.5M12 20.5v.5" {...stroke(color)} />
    </Svg>
  ),
  micdrop: ({ color, size = 28 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="9" y="2.5" width="6" height="11" rx="3" {...stroke(color)} />
      <Path d="M6 10.5a6 6 0 0 0 12 0M12 16.5V20M9 20.5h6" {...stroke(color)} />
    </Svg>
  ),
  correct: ({ color, size = 28 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="7" {...thick(color)} />
    </Svg>
  ),
  wrong: ({ color, size = 28 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...thick(color)} />
    </Svg>
  ),
};
