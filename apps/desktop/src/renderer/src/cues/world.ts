// 효과에 쓰는 3D 장면. 처음 3D 효과가 나올 때 한 번 만든다 (WebGL 창 하나를 계속 쓴다).
// 크기는 화면 높이 기준 단위로 잰다: 카메라에서 본 z=0 평면의 높이가 VIEW_H 다.
// 모델은 모두 기본 도형을 조립해 직접 만든다 (외부 3D 파일 없음).

import {
  CanvasTexture,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  DoubleSide,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const FOV = 35;
const CAMERA_Z = 10;
export const VIEW_H = 2 * CAMERA_Z * Math.tan(((FOV / 2) * Math.PI) / 180);

export class World {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(FOV, 16 / 9, 0.1, 100);
  readonly confetti: Confetti;
  /** z=0 평면에서 보이는 너비 (화면 비율에 따라 달라진다) */
  viewW = VIEW_H * (16 / 9);
  private shakeUntil = 0;
  private shakePower = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 6, 8);
    this.scene.add(key);
    this.camera.position.set(0, 0, CAMERA_Z);
    this.confetti = new Confetti(this);
  }

  resize(w: number, h: number, dpr: number) {
    if (w === 0 || h === 0) return;
    this.renderer.setPixelRatio(Math.min(2, dpr));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewW = VIEW_H * (w / h);
  }

  /** 마이크가 바닥을 칠 때처럼 화면을 잠깐 흔든다 */
  shake(power: number, ms: number) {
    this.shakePower = power;
    this.shakeUntil = performance.now() + ms;
  }

  render(now: number) {
    const left = this.shakeUntil - now;
    if (left > 0) {
      const k = this.shakePower * (left / 300);
      this.camera.position.set((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, CAMERA_Z);
    } else {
      this.camera.position.set(0, 0, CAMERA_Z);
    }
    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    this.renderer.clear();
  }

  /** 3D 좌표가 화면(캔버스 CSS 픽셀)의 어디에 보이는지 */
  toScreen(p: Vector3, w: number, h: number) {
    const v = p.clone().project(this.camera);
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
  }

  dispose() {
    this.renderer.dispose();
  }
}

// ---------- 재질 ----------
// 장난감처럼 매끈하고 반짝이는 느낌: 클리어코트 + 방 조명 반사.

const glossy = (color: number) => new MeshPhysicalMaterial({ color, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06 });
const chrome = () => new MeshStandardMaterial({ color: 0xe4e7ec, metalness: 1, roughness: 0.16 });

// ---------- 북 (두구두구) ----------

export interface DrumModel {
  group: Group;
  body: Group;
  /** 막대 끝을 얼마나 들어 올릴지 (0 = 북면에 닿음) */
  setSticks(left: number, right: number): void;
}

export function makeDrum(): DrumModel {
  const group = new Group();
  const body = new Group();
  group.add(body);
  const shellMat = glossy(0xd8382f);
  const metal = chrome();

  const shell = new Mesh(new CylinderGeometry(1, 1, 0.62, 96, 1, true), shellMat);
  body.add(shell);
  const head = new Mesh(new CylinderGeometry(0.99, 0.99, 0.02, 96), new MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.7 }));
  head.position.y = 0.31;
  body.add(head);
  const bottom = head.clone();
  bottom.position.y = -0.31;
  body.add(bottom);
  for (const y of [0.33, -0.33]) {
    const rim = new Mesh(new TorusGeometry(1.0, 0.05, 20, 120), metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    body.add(rim);
  }
  const lugGeo = new CapsuleGeometry(0.05, 0.24, 6, 12);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const lug = new Mesh(lugGeo, metal);
    lug.position.set(Math.cos(a) * 1.04, 0, Math.sin(a) * 1.04);
    body.add(lug);
  }
  // 북을 앞으로 기울여 북면이 보이게
  body.rotation.x = 0.5;

  // 막대: 손잡이 쪽을 축으로 두고 끝이 북면 위 한 점을 가리키게 돌린다
  const wood = new MeshStandardMaterial({ color: 0xd9a066, roughness: 0.42 });
  const up = new Vector3(0, 1, 0);
  const sticks = ([
    [new Vector3(-1.85, 1.25, 0.9), new Vector3(-0.32, 0.31, 0.22)],
    [new Vector3(1.85, 1.25, 0.9), new Vector3(0.32, 0.31, 0.22)],
  ] as const).map(([pivot, tip]) => {
    const len = pivot.distanceTo(tip);
    const g = new Group();
    const shaft = new Mesh(new CylinderGeometry(0.032, 0.05, len, 20), wood);
    shaft.position.y = len / 2;
    g.add(shaft);
    const bead = new Mesh(new SphereGeometry(0.05, 20, 12), wood);
    bead.scale.set(1, 1.45, 1);
    bead.position.y = len;
    g.add(bead);
    g.position.copy(pivot);
    body.add(g);
    return { g, pivot, tip, len };
  });
  const aim = new Vector3();
  const q = new Quaternion();
  const setSticks = (left: number, right: number) => {
    sticks.forEach((s, i) => {
      const lift = i === 0 ? left : right;
      aim.copy(s.tip).setY(s.tip.y + lift).sub(s.pivot).normalize();
      s.g.quaternion.copy(q.setFromUnitVectors(up, aim));
    });
  };
  setSticks(0.4, 0.4);
  return { group, body, setSticks };
}

// ---------- 마이크 (마이크 드롭) ----------

export const MIC = { headY: 0.95, headR: 0.4, tailY: -0.98, tailR: 0.14 };

export function makeMic(): Group {
  const g = new Group();
  // 그릴: 은색 바탕에 촘촘한 구멍 무늬를 그린 텍스처
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#c9ccd1';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#3a3d42';
  for (let row = 0; row < 32; row++) {
    for (let col = 0; col < 64; col++) {
      x.beginPath();
      x.arc(col * 8 + (row % 2 ? 4 : 0) + 4, row * 8 + 4, 2.3, 0, Math.PI * 2);
      x.fill();
    }
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const head = new Mesh(new SphereGeometry(MIC.headR, 64, 40), new MeshStandardMaterial({ map: tex, metalness: 0.85, roughness: 0.38 }));
  head.position.y = MIC.headY;
  g.add(head);
  const ring = new Mesh(new CylinderGeometry(0.33, 0.3, 0.12, 64), new MeshStandardMaterial({ color: 0xc9a45c, metalness: 1, roughness: 0.22 }));
  ring.position.y = 0.6;
  g.add(ring);
  const handle = new Mesh(new CylinderGeometry(0.27, 0.15, 1.5, 64), new MeshPhysicalMaterial({ color: 0x1f1d1b, roughness: 0.32, metalness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.1 }));
  handle.position.y = -0.2;
  g.add(handle);
  const cap = new Mesh(new SphereGeometry(MIC.tailR + 0.01, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), chrome());
  cap.position.y = -0.95;
  g.add(cap);
  return g;
}

// ---------- O / X ----------

export function makeO(): Mesh {
  return new Mesh(new TorusGeometry(1, 0.3, 48, 128), glossy(0x2f7bff));
}

export function makeX(): Group {
  const g = new Group();
  const mat = glossy(0xff3b30);
  const geo = new RoundedBoxGeometry(2.5, 0.56, 0.56, 6, 0.22);
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new Mesh(geo, mat);
    bar.rotation.z = a;
    g.add(bar);
  }
  return g;
}

// ---------- 꽃가루 ----------
// 종잇조각 하나하나가 진짜로 뒤집히며 떨어진다. 인스턴스 하나로 1600장까지 그린다.

const CONFETTI_MAX = 1600;
const CONFETTI_COLORS = [0xff5c5c, 0xffb02e, 0xffd60a, 0x34c759, 0x2f8bff, 0xaf52de, 0xff7ac6, 0xffffff, 0x5ac8fa];

interface Piece {
  p: Vector3;
  v: Vector3;
  axis: Vector3;
  angle: number;
  spin: number;
  sway: number;
  phase: number;
  scale: number;
  born: number;
}

class Confetti {
  private mesh: InstancedMesh;
  private pieces: Piece[] = [];
  private dummy = new Object3D();
  private q = new Quaternion();

  constructor(private world: World) {
    const mat = new MeshStandardMaterial({ side: DoubleSide, roughness: 0.45, metalness: 0.25 });
    this.mesh = new InstancedMesh(new PlaneGeometry(0.1, 0.17), mat, CONFETTI_MAX);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    const col = new Color();
    for (let i = 0; i < CONFETTI_MAX; i++) this.mesh.setColorAt(i, col.setHex(CONFETTI_COLORS[i % CONFETTI_COLORS.length]!));
    world.scene.add(this.mesh);
  }

  get busy() {
    return this.pieces.length > 0;
  }

  /** 화면 아래 양쪽 모서리에서 안쪽 위로 한 번씩 쏜다 */
  burst(now: number, perSide: number) {
    const { viewW } = this.world;
    for (const side of [-1, 1]) {
      for (let i = 0; i < perSide && this.pieces.length < CONFETTI_MAX; i++) {
        const angle = ((55 + Math.random() * 25) * Math.PI) / 180;
        const speed = 10 + Math.random() * 5;
        this.pieces.push({
          p: new Vector3(side * (viewW / 2 - 0.2), -VIEW_H / 2 - 0.2, (Math.random() - 0.5) * 3),
          v: new Vector3(-side * Math.cos(angle) * speed, Math.sin(angle) * speed, (Math.random() - 0.5) * 2),
          axis: new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
          angle: Math.random() * Math.PI * 2,
          spin: 4 + Math.random() * 9,
          sway: 1.5 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
          scale: 0.7 + Math.random() * 0.6,
          born: now,
        });
      }
    }
  }

  update(now: number, dt: number) {
    const drag = Math.exp(-1.4 * dt);
    const list = this.pieces;
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i]!;
      c.v.y -= 4 * dt;
      c.v.multiplyScalar(drag);
      c.v.x += Math.sin(now / 1000 * c.sway + c.phase) * 2.2 * dt;
      c.p.addScaledVector(c.v, dt);
      c.angle += c.spin * dt;
      if (c.p.y < -VIEW_H / 2 - 0.6 || now - c.born > 9000) {
        list[i] = list[list.length - 1]!;
        list.pop();
      }
    }
    // 떨어진 조각을 빼면서 순서가 섞이니 색은 인덱스에 붙어 있어도 계속 다양하게 보인다
    for (let i = 0; i < list.length; i++) {
      const c = list[i]!;
      this.dummy.position.copy(c.p);
      this.dummy.quaternion.copy(this.q.setFromAxisAngle(c.axis, c.angle));
      this.dummy.scale.setScalar(c.scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.count = list.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
