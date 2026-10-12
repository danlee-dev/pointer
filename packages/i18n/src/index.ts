// 화면 문구. 한국어가 원본이고 영어는 같은 키를 반드시 다 채운다 (타입이 강제한다).

export type Locale = 'ko' | 'en';

const ko = {
  // ---------- 공통 ----------
  close: '닫기',
  cancel: '취소',

  tool: {
    laser: '레이저',
    spotlight: '스포트라이트',
    magnify: '돋보기',
    pen: '펜',
  },
  toolHint: {
    laser: '슬라이드를 누른 채 움직이면 레이저가 나갑니다',
    spotlight: '누른 곳 주변만 밝게 비춥니다',
    magnify: '누른 곳을 크게 보여 줍니다',
    pen: '손가락으로 그리면 화면에 그려집니다. 장을 넘기면 지워집니다',
  },

  // ---------- 폰 리모컨 ----------
  remote: {
    connecting: '컴퓨터에 연결하는 중',
    reconnecting: '연결이 끊겼습니다. 다시 연결하는 중',
    expired: '연결 주소가 바뀌었습니다',
    expiredSub: '컴퓨터의 pointer 앱에 뜬 새 QR 코드를 찍어 주세요.',
    revoked: '컴퓨터에서 이 폰의 연결을 끊었습니다',
    versionMismatch: '컴퓨터 앱과 버전이 맞지 않습니다. 둘 다 최신으로 업데이트해 주세요.',
    noDeck: '컴퓨터에서 발표 자료를 열면 여기에 나타납니다',
    prev: '이전',
    next: '다음',
    last: '마지막 장',
    clearInk: '지우기',
    blanked: { black: '청중 화면이 검게 가려져 있습니다', white: '청중 화면이 하얗게 가려져 있습니다' },
    unblankHint: '다음이나 이전을 누르면 다시 켜집니다',
    jumpTitle: '몇 번째 장으로 갈까요',
    more: '더보기',
    blankBlack: '검은 화면으로 가리기',
    blankWhite: '흰 화면으로 가리기',
    unblank: '화면 다시 켜기',
    vibration: '진동',
    fullscreen: '전체 화면으로 보기',
    exitFullscreen: '전체 화면 끝내기',
    on: '켜짐',
    off: '꺼짐',
    notes: '발표 메모',
    ms: (n: number) => `${n}ms`,
  },

  // ---------- 타이머 ----------
  timer: {
    title: '타이머',
    sub: '처음 넘길 때 자동으로 시작합니다. 목표 시간을 정하면 5분, 1분 남았을 때와 끝났을 때 폰이 진동합니다.',
    start: '시작',
    pause: '일시정지',
    resume: '계속',
    reset: '0으로',
    target: '목표 시간',
    noTarget: '목표 없음',
    minutes: (n: number) => `${n}분`,
    left: '남음',
    over: '초과',
  },

  // ---------- 데스크톱 홈 ----------
  home: {
    dropTitle: '발표 자료를 여기로 끌어 놓으세요',
    dropSub: 'PDF, PowerPoint, Keynote, 또는 이미지 여러 장',
    open: '파일 열기',
    recent: '최근 자료',
    recentEmpty: '열었던 자료가 여기에 쌓입니다.',
    missing: '파일을 찾을 수 없습니다',
    remove: '목록에서 빼기',
    pages: (n: number) => `${n}장`,
  },

  connect: {
    title: '폰 연결',
    sub: '폰 카메라로 QR 코드를 찍으세요. 폰과 이 컴퓨터가 같은 와이파이에 있어야 합니다.',
    none: '아직 연결된 폰이 없습니다',
    devices: (n: number) => `${n}대 연결됨`,
    kick: '끊기',
    rotate: 'QR 새로 만들기',
    rotateConfirm: '지금 연결된 폰이 모두 끊기고, 예전 QR 로는 더 이상 접속할 수 없습니다.',
    noNetwork: '네트워크에 연결되어 있지 않습니다. 와이파이를 확인해 주세요.',
    otherAddress: '다른 네트워크 주소',
    isolationHelp: '폰에서 안 열리면 와이파이가 기기끼리 통신을 막고 있을 수 있습니다. 폰 핫스팟에 컴퓨터를 연결해 보세요.',
    platform: { ios: 'iPhone', android: 'Android', web: '브라우저', desktop: '컴퓨터' },
  },

  // ---------- 발표자 화면 ----------
  presenter: {
    start: '발표 시작',
    stop: '발표 끝내기',
    closeDeck: '자료 닫기',
    nextSlide: '다음 장',
    endOfDeck: '마지막 장입니다',
    notesPlaceholder: '이 장에서 할 말을 적어 두세요. 폰 리모컨에도 보입니다.',
    blanked: { black: '청중 화면 가림 (검정)', white: '청중 화면 가림 (흰색)' },
    keys: '방향키·PageUp/Down 넘기기, B 검은 화면, W 흰 화면, F 전체화면, Esc 발표 끝내기',
    presenting: '청중 화면에 나가는 중',
    swap: '화면 바꾸기',
    fullscreen: '전체화면',
    exitFullscreen: '전체화면 끝내기',
    mirrorOff: '미러링을 잠시 끄고 이 화면에 발표자 보기를 띄웠습니다. 발표가 끝나면 다시 미러링합니다.',
  },

  audience: {
    escHint: 'Esc 를 누르면 발표를 끝냅니다',
  },

  password: {
    title: '암호로 보호된 PDF',
    sub: (name: string) => `${name} 을(를) 열려면 암호가 필요합니다.`,
    wrong: '암호가 맞지 않습니다.',
    submit: '열기',
  },

  ai: {
    title: 'AI 와 대본 쓰기',
    sub: 'Claude 나 Codex 가 열린 자료를 읽고 장별 메모(대본)를 같이 씁니다. 쓴 메모는 발표자 화면과 폰에 바로 보입니다. 이 컴퓨터 안에서만 연결됩니다.',
    copy: '복사',
    copied: '복사했습니다',
    howClaudeCode: '터미널에 붙여 넣고, Claude Code 에서 /mcp__pointer__write_script 를 입력하면 시작합니다.',
    howCodex: '터미널에 붙여 넣고, Codex 에게 "pointer 로 발표 대본 같이 쓰자" 라고 말하면 됩니다.',
    howDesktop: 'Claude Desktop 의 설정 > 개발자 > 구성 편집에서 claude_desktop_config.json 에 붙여 넣고 Claude Desktop 을 다시 켜세요. Node.js 가 필요합니다.',
  },

  convert: {
    converting: {
      powerpoint: 'PowerPoint 로 PDF 를 만드는 중입니다. 처음 한 번만 걸립니다.',
      keynote: 'Keynote 로 PDF 를 만드는 중입니다. 처음 한 번만 걸립니다.',
      libreoffice: 'LibreOffice 로 PDF 를 만드는 중입니다. 처음 한 번만 걸립니다.',
    },
    notesImported: (n: number) => `발표자 노트 ${n}장을 메모로 가져왔습니다.`,
  },

  error: {
    open: '이 파일을 열 수 없습니다',
    noConverter: 'PowerPoint, Keynote, LibreOffice 중 하나가 있어야 이 파일을 열 수 있습니다. 발표 앱에서 PDF 로 내보내서 열어도 됩니다.',
    convertFailed: 'PDF 로 바꾸지 못했습니다. 발표 앱에서 PDF 로 내보낸 뒤 열어 주세요.',
    convertTimeout: '변환이 너무 오래 걸려서 멈췄습니다. 발표 앱에 대화상자가 떠 있는지 확인해 주세요.',
    mixed: 'PDF·발표 파일은 한 번에 하나만, 이미지와 섞지 말고 열어 주세요.',
    unsupported: '지원하지 않는 형식입니다. PDF, PowerPoint, Keynote, 이미지(PNG, JPG, WebP, GIF)를 열어 주세요.',
    noImages: '이 폴더에 이미지가 없습니다.',
  },

  settings: {
    language: '언어',
    system: '시스템 설정',
  },

  menu: {
    file: '파일',
    open: '열기…',
    closeDeck: '자료 닫기',
    present: '발표 시작',
    stop: '발표 끝내기',
    view: '보기',
    language: '언어',
    newQr: '연결 QR 새로 만들기',
  },
};

export type Messages = typeof ko;

const en: Messages = {
  close: 'Close',
  cancel: 'Cancel',

  tool: {
    laser: 'Laser',
    spotlight: 'Spotlight',
    magnify: 'Zoom',
    pen: 'Pen',
  },
  toolHint: {
    laser: 'Touch and drag on the slide to point',
    spotlight: 'Lights up only the area you touch',
    magnify: 'Magnifies the area you touch',
    pen: 'Draw with your finger. Ink clears when the slide changes',
  },

  remote: {
    connecting: 'Connecting to your computer',
    reconnecting: 'Connection lost. Reconnecting',
    expired: 'This link has changed',
    expiredSub: 'Scan the new QR code shown in the pointer app on your computer.',
    revoked: 'Your computer disconnected this phone',
    versionMismatch: 'This remote and the computer app are out of date with each other. Update both.',
    noDeck: 'Open a presentation on your computer and it will show up here',
    prev: 'Back',
    next: 'Next',
    last: 'Last slide',
    clearInk: 'Clear',
    blanked: { black: 'The audience screen is black', white: 'The audience screen is white' },
    unblankHint: 'Press Next or Back to show slides again',
    jumpTitle: 'Go to slide',
    more: 'More',
    blankBlack: 'Black out the screen',
    blankWhite: 'White out the screen',
    unblank: 'Show slides again',
    vibration: 'Vibration',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    on: 'On',
    off: 'Off',
    notes: 'Notes',
    ms: (n: number) => `${n} ms`,
  },

  timer: {
    title: 'Timer',
    sub: 'Starts on your first slide change. Set a goal and your phone vibrates at 5 minutes left, 1 minute left, and time up.',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
    target: 'Goal',
    noTarget: 'No goal',
    minutes: (n: number) => `${n} min`,
    left: 'left',
    over: 'over',
  },

  home: {
    dropTitle: 'Drop a presentation here',
    dropSub: 'A PDF, PowerPoint or Keynote file, or a set of images',
    open: 'Open file',
    recent: 'Recent',
    recentEmpty: 'Files you open will show up here.',
    missing: 'File not found',
    remove: 'Remove from list',
    pages: (n: number) => (n === 1 ? '1 slide' : `${n} slides`),
  },

  connect: {
    title: 'Connect your phone',
    sub: 'Scan the QR code with your phone camera. Your phone and this computer need to be on the same Wi-Fi.',
    none: 'No phone connected yet',
    devices: (n: number) => (n === 1 ? '1 phone connected' : `${n} phones connected`),
    kick: 'Disconnect',
    rotate: 'New QR code',
    rotateConfirm: 'All connected phones will be disconnected and the old QR code will stop working.',
    noNetwork: 'Not connected to a network. Check your Wi-Fi.',
    otherAddress: 'Other network address',
    isolationHelp: "If it won't open on your phone, the Wi-Fi may block devices from talking to each other. Try connecting this computer to your phone's hotspot.",
    platform: { ios: 'iPhone', android: 'Android', web: 'Browser', desktop: 'Computer' },
  },

  presenter: {
    start: 'Start',
    stop: 'End presentation',
    closeDeck: 'Close file',
    nextSlide: 'Next slide',
    endOfDeck: 'End of presentation',
    notesPlaceholder: 'What to say on this slide. Also shown on your phone.',
    blanked: { black: 'Audience screen hidden (black)', white: 'Audience screen hidden (white)' },
    keys: 'Arrow keys or PageUp/Down to move, B black, W white, F full screen, Esc to end',
    presenting: 'Showing on the audience screen',
    swap: 'Swap displays',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    mirrorOff: 'Mirroring is off while you present so this screen can show presenter view. It comes back when you finish.',
  },

  audience: {
    escHint: 'Press Esc to end the presentation',
  },

  password: {
    title: 'Password-protected PDF',
    sub: (name: string) => `${name} needs a password to open.`,
    wrong: 'Wrong password.',
    submit: 'Open',
  },

  ai: {
    title: 'Write your script with AI',
    sub: 'Claude or Codex reads the open presentation and drafts notes for each slide. Notes show up right away on the presenter view and your phone. The connection stays on this computer.',
    copy: 'Copy',
    copied: 'Copied',
    howClaudeCode: 'Paste this into a terminal, then type /mcp__pointer__write_script in Claude Code.',
    howCodex: 'Paste this into a terminal, then ask Codex to "write a talk script with pointer".',
    howDesktop: 'In Claude Desktop, open Settings > Developer > Edit Config, paste this into claude_desktop_config.json, and restart Claude Desktop. Requires Node.js.',
  },

  convert: {
    converting: {
      powerpoint: 'Making a PDF with PowerPoint. This only happens the first time.',
      keynote: 'Making a PDF with Keynote. This only happens the first time.',
      libreoffice: 'Making a PDF with LibreOffice. This only happens the first time.',
    },
    notesImported: (n: number) => (n === 1 ? 'Imported speaker notes for 1 slide.' : `Imported speaker notes for ${n} slides.`),
  },

  error: {
    open: "Couldn't open this file",
    noConverter: 'Opening this file needs PowerPoint, Keynote or LibreOffice. You can also export it to PDF and open that.',
    convertFailed: "Couldn't convert it to PDF. Export it to PDF from your presentation app and open that.",
    convertTimeout: 'Conversion took too long and was stopped. Check whether your presentation app is showing a dialog.',
    mixed: 'Open one PDF or presentation at a time, and keep images separate.',
    unsupported: 'Unsupported format. Open a PDF, PowerPoint or Keynote file, or images (PNG, JPG, WebP, GIF).',
    noImages: 'There are no images in this folder.',
  },

  settings: {
    language: 'Language',
    system: 'System default',
  },

  menu: {
    file: 'File',
    open: 'Open…',
    closeDeck: 'Close File',
    present: 'Start Presentation',
    stop: 'End Presentation',
    view: 'View',
    language: 'Language',
    newQr: 'New Connection QR Code',
  },
};

const ALL: Record<Locale, Messages> = { ko, en };

/** 'ko-KR', 'ko' -> ko, 나머지는 en */
export function resolveLocale(tag: string | null | undefined): Locale {
  return tag && tag.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function messages(locale: Locale): Messages {
  return ALL[locale];
}
