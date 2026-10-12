// 첫 화면 기기 이미지 (apps/site/scripts/render-devices.html 로 정면에서 렌더링)와 그 안의 화면 자리.
// quad 는 이미지 크기에 대한 비율 좌표: 화면의 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래.
// screen 은 그 위에 얹는 데모 화면의 기준 크기(CSS px)와 모서리 반지름. 실제 화면 비율·둥근 정도와 같다.

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
  screen: { w: number; h: number; radiusTop: number; radiusBottom: number };
}

export const MACBOOK: Device = {
  src: '/devices/macbook.webp',
  aspect: 1778 / 1231,
  quad: { tl: [0.08858, 0.04823], tr: [0.91142, 0.04829], br: [0.92161, 0.79247], bl: [0.07838, 0.79242] },
  // 화면 실측 0.3008 x 0.1955 m. 둥근 모서리도 모델에서 잰 비율 그대로
  // 위 모서리 반지름은 렌더 이미지에서 잰 값 (검은 화면 영역이 둥글어지는 곡선: 화면 폭 1463px 에서 약 18.5px).
  // 메쉬로 재면 위 가장자리의 노치 홈 때문에 곧은 구간이 길게 잡혀 절반쯤으로 작게 나온다.
  screen: { w: 1000, h: 650, radiusTop: 12.7, radiusBottom: 0.0 },
};

export const IPHONE: Device = {
  src: '/devices/iphone.webp',
  aspect: 1038 / 2052,
  quad: { tl: [0.07469, 0.03501], tr: [0.92531, 0.03501], br: [0.92531, 0.96498], bl: [0.07469, 0.96498] },
  // 화면 실측 0.0713 x 0.1540 m.
  // 모서리 반지름은 테두리 안쪽 곡선과 같은 중심이 되게 잡았다 (모서리에서도 검은 테두리 간격이 옆면과 같게).
  // 렌더된 페이지를 4배로 키워 잰 값: 테두리 안쪽 반지름 143, 테두리-화면 간격 24 -> 화면 반지름 120 (= 기준 크기 35px).
  // 화면 판 메쉬로 재면 곡선이 윗변에 붙는 거의 평평한 구간까지 곧은 변으로 잡혀 28 로 작게 나왔다.
  screen: { w: 290, h: 627, radiusTop: 35, radiusBottom: 35 },
};
