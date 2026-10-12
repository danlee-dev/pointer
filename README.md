# pointer

폰으로 넘기는 발표 리모컨. 맥·윈도우에서 PDF·이미지 발표를 띄우고, 같은 와이파이의 폰으로
넘기고 가리킨다. (이름은 임시)

- 데스크톱 앱 (Electron): 발표자 보기 + 청중 화면, 레이저·스포트라이트·돋보기·판서, 타이머, 장별 메모
- 여는 자료: PDF, 이미지 묶음, PowerPoint(pptx·ppt), Keynote(key). PowerPoint·Keynote 파일은 이 컴퓨터의
  PowerPoint / Keynote / LibreOffice 로 PDF 를 만들어 연다 (처음 한 번만, 결과는 캐시). 발표자 노트는 장별 메모로 가져온다
- 안드로이드: 설치 없이 QR 로 여는 웹 리모컨
- iOS: 앱 (볼륨 버튼으로 넘기기) — 준비 중

기획은 [docs/plan.md](docs/plan.md), 디자인은 [DESIGN.md](DESIGN.md), 브랜드·로고는 [BRAND.md](BRAND.md).

## 구조

```
apps/desktop          Electron 앱 (main / preload / renderer)
packages/remote-web   폰 웹 리모컨. 데스크톱 앱이 4747 포트에서 내려준다
packages/protocol     폰 <-> 데스크톱 메시지, 연결 주소, 타이머 계산
packages/i18n         한국어·영어 문구
packages/design       색·모서리·글자 토큰 (tokens.css)
brand/                로고 원본 스크립트와 결과물
legacy/               첫 프로토타입 (Node 서버 하나짜리)
```

## 실행

```bash
pnpm install
pnpm dev
```

`pnpm dev` 는 웹 리모컨을 빌드한 뒤 데스크톱 앱을 개발 모드로 띄운다.
pnpm 10 은 설치 스크립트를 막아서 Electron 실행 파일이 안 받아질 수 있다. 그럴 땐:

```bash
node node_modules/electron/install.js
```

개발 중 화면이 하나뿐이면 청중 화면이 전체를 덮는다. 작은 창으로 띄우려면:

```bash
POINTER_WINDOWED_AUDIENCE=1 pnpm --filter @pointer/desktop dev
```

## 검사

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 배포 파일 만들기

```bash
pnpm --filter @pointer/desktop dist:mac
pnpm --filter @pointer/desktop dist:win
```

맥 서명·공증은 아직 꺼 두었다 (`electron-builder.yml`). 윈도우는 Microsoft Store 용 MSIX 도 같이 만든다.

## 폰 연결이 안 될 때

- 폰과 컴퓨터가 같은 와이파이인지 확인
- 학교·행사장 와이파이는 기기끼리 통신을 막는 경우가 많다. 폰 개인용 핫스팟에 컴퓨터를 붙인다
- 윈도우는 처음 실행할 때 방화벽 허용 창이 뜬다. "개인 네트워크" 를 허용한다
