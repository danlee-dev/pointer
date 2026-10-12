// 첫 화면 기기 이미지 (apps/site/scripts/render-devices.html 로 렌더링)와 그 안의 화면 자리.
// quad 는 이미지 크기에 대한 비율 좌표: 화면의 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래.
// 화면 크기(screen)는 그 위에 얹는 데모 화면의 기준 크기(CSS px). 실제 화면 비율과 같게 맞췄다.

export interface Quad {
  tl: [number, number];
  tr: [number, number];
  br: [number, number];
  bl: [number, number];
}

export interface Device {
  src: string;
  /** 이미지 원본 비율 (가로 / 세로) */
  aspect: number;
  quad: Quad;
  screen: { w: number; h: number };
}

export const MACBOOK: Device = {
  src: '/devices/macbook.webp',
  aspect: 2060 / 1705,
  quad: { tl: [0.25997, 0.03829], tr: [0.96740, 0.08055], br: [0.93033, 0.66071], bl: [0.21960, 0.59301] },
  // MacBook Pro 14 화면 비율 1.54 (실측 0.3008 x 0.1955 m)
  screen: { w: 1000, h: 650 },
};

export const IPHONE: Device = {
  src: '/devices/iphone.webp',
  aspect: 1007 / 2008,
  quad: { tl: [0.13828, 0.03066], tr: [0.94051, 0.06118], br: [0.88713, 0.95456], bl: [0.08773, 0.96743] },
  // iPhone 15 Pro Max 화면 비율 0.46 (실측 0.0713 x 0.1540 m)
  screen: { w: 290, h: 627 },
};
