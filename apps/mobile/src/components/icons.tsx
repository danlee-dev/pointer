// 웹 리모컨과 같은 24px 선 아이콘 (react-native-svg)

import Svg, { Circle, Path, Rect } from 'react-native-svg';

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
