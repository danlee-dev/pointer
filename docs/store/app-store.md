# App Store 등록 정보 (iOS 1.0)

App Store Connect 에 그대로 붙여 넣는 값. 괄호 안은 글자 수 제한.

## 기본

| 항목 | 값 |
| --- | --- |
| 번들 ID | `dev.danlee.pointer` |
| SKU | `pointer-ios` |
| 기본 언어 | 한국어 (영어 현지화 추가) |
| 카테고리 | 기본: 생산성, 보조: 비즈니스 |
| 가격 | 무료 |
| 연령 등급 | 4+ (질문 전부 "없음") |
| 저작권 | 2026 danlee-dev |
| 지원 URL | https://pointer-presenter.vercel.app/support |
| 마케팅 URL | https://pointer-presenter.vercel.app |
| 개인정보 처리방침 URL | https://pointer-presenter.vercel.app/privacy |
| 앱 개인정보 (영양 성분표) | 데이터를 수집하지 않음 |
| 수출 규정 | 암호화 안 씀 (Info.plist `ITSAppUsesNonExemptEncryption = false` 라 묻지 않는다) |

## 한국어

**이름 (30)**
pointer - 발표 리모컨

**부제 (30)**
폰으로 넘기고, 레이저로 가리키고

**프로모션 텍스트 (170)**
두구두구, 꽃가루, 딩동댕. 누르고 있는 동안 이어지는 발표 효과가 새로 들어왔습니다.

**설명 (4000)**
컴퓨터에 띄운 발표 자료를 폰으로 넘기고 가리키세요.

컴퓨터에서 pointer 앱을 열고 화면에 뜬 QR 코드를 찍으면 바로 연결됩니다. 계정도, 서버도 없습니다. 같은 와이파이 안에서 폰과 컴퓨터가 직접 이야기합니다.

넘기기
- 큰 다음·이전 버튼, 장 목록에서 원하는 장으로 바로 이동
- 설정에서 켜면 볼륨 버튼으로 넘기기 (올리기 다음, 내리기 이전)
- 넘길 때마다 짧은 진동

가리키기
- 레이저: 슬라이드를 누른 채 움직이면 청중 화면에 레이저가 나갑니다
- 에어 포인터: 누른 채 폰을 기울이면 레이저가 따라 움직입니다
- 스포트라이트, 돋보기, 펜

효과
- 꽃가루, 두구두구, 박수, 불꽃놀이, 마이크 드롭, 딩동댕, 땡
- 누르고 있는 동안 이어지고, 떼면 마무리됩니다. 소리는 컴퓨터에서 납니다

발표에만 집중하도록
- 발표 메모를 폰에서 바로 확인
- 목표 시간을 정하면 5분, 1분 남았을 때와 넘겼을 때 진동으로 알림
- 청중 화면을 잠깐 검게, 하얗게 가리기
- 발표하는 동안 화면이 꺼지지 않습니다

컴퓨터 앱 (Mac, Windows, 무료)
- PDF, 이미지, PowerPoint, Keynote 파일
- 노트북에는 발표자 보기, 프로젝터에는 슬라이드만
- 다운로드: https://pointer-presenter.vercel.app

안드로이드 폰은 설치 없이 컴퓨터 앱의 QR 코드를 찍으면 Chrome 에서 리모컨이 열립니다.

**키워드 (100, 쉼표로 구분)**
발표,프레젠테이션,리모컨,PPT,파워포인트,키노트,레이저포인터,슬라이드,PDF,발표자,강의,수업,세미나

## English

**Name (30)**
pointer - Presentation Remote

**Subtitle (30)**
Advance, point and play cues

**Promotional text (170)**
Drumroll, confetti and a correct-answer chime. New effects keep going while you hold and land when you let go.

**Description (4000)**
Control the slides on your computer from your phone.

Open pointer on your computer and scan the QR code it shows. That is the whole setup: no account and no server. Your phone and computer talk directly over the same Wi-Fi.

Move through slides
- Big next and back buttons, or jump to any slide from the thumbnails
- Turn on volume buttons in settings to move with them (up for next, down for back)
- A short haptic tap on every change

Point
- Laser: touch and drag on the slide and the laser appears on the audience screen
- Air pointer: hold and tilt your phone to move the laser
- Spotlight, magnifier and pen

Effects
- Confetti, drumroll, applause, fireworks, mic drop, correct and wrong
- They keep going while you hold and finish when you let go. Sound plays from the computer

Stay on track
- Speaker notes on your phone
- Set a target time and get a buzz at 5 minutes left, 1 minute left and when you run over
- Black out or white out the audience screen for a moment
- The screen stays on while you present

Computer app (Mac and Windows, free)
- PDF, images, PowerPoint and Keynote files
- Presenter view on your laptop, only the slides on the projector
- Download: https://pointer-presenter.vercel.app

Android phones need no install: scan the QR code from the computer app and the remote opens in Chrome.

**Keywords (100)**
presentation,remote,slides,powerpoint,keynote,laser pointer,clicker,pdf,presenter,lecture,teaching

## 심사 메모 (App Review Information > Notes)

pointer is a remote for a free companion app on Mac or Windows. The phone and the computer connect directly over the local network; there is no account and no server.

To test:
1. Download the Mac app from https://pointer-presenter.vercel.app (or the GitHub release linked there) and open any PDF.
2. Make sure the iPhone is on the same Wi-Fi, open pointer on the iPhone and scan the QR code shown in the Mac app (or tap "Enter address" and type the address shown under the QR code).
3. Tap Next, drag on the slide for the laser, and open the sparkle button for effects.

Notes on permissions and features:
- Local network: used only to reach the computer app on the same Wi-Fi.
- Camera: used only to scan the pairing QR code. Images are not stored.
- Motion: used only for the optional air pointer, processed on the device.
- Volume buttons: off by default. When the user turns the setting on, volume up and down move slides only while the remote screen is open. The system volume is restored and the buttons work normally everywhere else.

## 스크린샷

6.9인치 (1320 x 2868) 필수. `docs/store/screenshots/` 에 있다. 파일 이름 순서대로 올린다:
1. `01-remote.png` 리모컨 (레이저)
2. `02-effects.png` 효과
3. `03-jump.png` 장 목록
4. `04-settings.png` 설정 (볼륨 버튼, 목표 시간)

원본 캡처는 `screenshots/raw/`, 합성 방법은 `docs/store/compose.py` 맨 위.
