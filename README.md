# pointer

폰으로 넘기는 발표 리모컨. 맥·윈도우에서 PDF·이미지 발표를 띄우고, 같은 와이파이의 폰으로
넘기고 가리킨다. (이름은 임시)

- 데스크톱 앱 (Electron): 발표자 보기 + 청중 화면, 레이저·스포트라이트·돋보기·판서, 타이머, 장별 메모
- 여는 자료: PDF, 이미지 묶음, PowerPoint(pptx·ppt), Keynote(key). PowerPoint·Keynote 파일은 이 컴퓨터의
  PowerPoint / Keynote / LibreOffice 로 PDF 를 만들어 연다 (처음 한 번만, 결과는 캐시). 발표자 노트는 장별 메모로 가져온다
- AI 와 대본 쓰기: 앱이 이 컴퓨터 안에서만 열리는 MCP 서버(127.0.0.1:4750)를 띄운다. Claude Code·Codex·Claude Desktop 이
  붙어서 장 글자·그림을 읽고 장별 메모를 쓴다. 연결 명령은 홈 화면 "AI 와 대본 쓰기" 에서 복사한다
- 안드로이드: 설치 없이 QR 로 여는 웹 리모컨
- iOS: Expo 앱. QR 이나 주소로 연결, 마지막 컴퓨터 자동 재연결, 볼륨 버튼으로 넘기기(설정에서 켜기),
  햅틱, 에어 포인터(누른 채 폰을 기울이면 레이저가 따라감), 화면 꺼짐 방지

기획은 [docs/plan.md](docs/plan.md), 디자인은 [DESIGN.md](DESIGN.md), 브랜드·로고는 [BRAND.md](BRAND.md).

## 구조

```
apps/desktop          Electron 앱 (main / preload / renderer)
apps/mobile           iOS 앱 (Expo 개발 빌드)
apps/site             홈페이지 (Astro 정적 사이트: 소개, 개인정보 처리방침, 지원)
packages/remote-web   폰 웹 리모컨. 데스크톱 앱이 4747 포트에서 내려준다
packages/remote-core  폰 쪽 연결 코드 (웹 리모컨과 iOS 앱이 같이 쓴다)
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

## iOS 앱

Expo Go 로는 안 된다 (볼륨 버튼 모듈이 들어 있어서 개발 빌드가 필요하다).

```bash
pnpm --filter @pointer/mobile prebuild
cd apps/mobile/ios && LANG=en_US.UTF-8 pod install && cd -
pnpm --filter @pointer/mobile ios
```

실제 아이폰: `apps/mobile/ios/pointer.xcworkspace` 를 Xcode 로 열고 Signing 에서 팀을 고른 뒤 폰을 골라 실행.
볼륨 버튼과 에어 포인터는 시뮬레이터에 버튼·자이로가 없어서 실제 폰에서만 확인할 수 있다.

## 홈페이지

```bash
pnpm --filter @pointer/site dev      # http://localhost:5180
pnpm --filter @pointer/site build    # apps/site/dist
```

제품 이름, 다운로드·App Store 주소, GitHub, 문의 창구는 `apps/site/src/site.ts` 한 곳에 있다.
링크가 `null` 이면 화면에 "준비 중" 으로 나온다.

첫 화면의 맥북·아이폰은 3D 모델을 렌더링한 이미지(`public/devices/`)이고, 그 화면 자리에 진짜 데모를 원근에 맞춰 얹는다
(`src/data/devices.ts`, `src/scripts/warp.ts`). 모델 원본은 저장소에 올리지 않는다:
아이폰은 Sketchfab polyman 의 CC BY 4.0 (사이트 아래에 출처 표기), 맥북은 Sketchfab Standard (파일 재배포 금지, 렌더 이미지로만 쓴다).
다시 렌더링하는 법은 `apps/site/scripts/render-devices.mjs` 맨 위에 있다.
효과 버튼 아이콘은 Microsoft Fluent Emoji 3D (MIT, 고지문은 `apps/site/public/icons/fx/LICENSE-fluentui-emoji.txt`). 딩동댕 O 는 앱 안의 O 와 같은 파랑으로 색만 돌렸다.

공유 이미지(og.png)는
`node apps/site/scripts/build-og.mjs <@resvg/resvg-js 가 있는 node_modules>` 로 다시 만든다.

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
