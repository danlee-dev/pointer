// 홈페이지 첫 화면 문구. 한국어가 원본이고 영어는 같은 키를 다 채운다 (타입이 강제한다).
// 앱 안 문구(packages/i18n)와 같은 말을 쓰는 곳은 그대로 맞춘다.

import { site } from '../site';

const name = site.name;

export type Platform = 'mac' | 'windows' | 'ios';
export type Tool = 'laser' | 'spotlight' | 'magnify' | 'pen';
export type Cue = 'confetti' | 'drumroll' | 'applause' | 'fireworks' | 'micdrop' | 'correct' | 'wrong';

export interface SlideCopy {
  kind: 'title' | 'statement' | 'chart' | 'three' | 'end';
  title: string;
  sub?: string;
  items?: string[];
}

const ko = {
  meta: {
    title: `${name} · 폰으로 넘기는 발표 리모컨`,
    description:
      'QR 코드 한 번이면 폰이 발표 리모컨이자 레이저 포인터가 됩니다. 발표자 보기, 진동 타이머, 효과, PowerPoint·Keynote 메모까지. 맥·윈도우, 무료, 계정 없이.',
  },
  hero: {
    title: ['폰으로 넘기고,', '가리키고.'],
    sub: 'QR 코드 한 번이면 손에 든 폰이 리모컨이자 레이저 포인터가 됩니다. 무료이고, 계정은 필요 없습니다.',
    android: '안드로이드 폰은 설치할 것이 없습니다. 컴퓨터 앱에 뜬 QR을 찍으면 Chrome에서 리모컨이 열립니다.',
    caption: '폰 화면의 슬라이드를 누른 채 움직여 보세요. 다음을 누르면 장이 넘어갑니다.',
  },
  download: {
    mac: 'Mac 앱 받기',
    windows: 'Windows 앱 받기',
    ios: 'App Store에서 받기',
    names: { mac: 'Mac', windows: 'Windows', ios: 'iPhone' } as Record<Platform, string>,
    soon: (list: string[]) => `${list.join(' · ')} 앱은 곧 공개합니다.`,
  },
  demo: {
    label: '직접 눌러 보는 데모. 폰 화면을 누르면 위쪽 화면에 나타납니다.',
    screen: '청중 화면',
    phone: '폰 리모컨',
    prev: '이전',
    next: '다음',
    last: '마지막 장',
    clear: '지우기',
    tool: { laser: '레이저', spotlight: '스포트라이트', magnify: '돋보기', pen: '펜' } as Record<Tool, string>,
    hint: {
      laser: '슬라이드를 누른 채 움직이면 레이저가 나갑니다',
      spotlight: '누른 곳 주변만 밝게 비춥니다',
      magnify: '누른 곳을 크게 보여 줍니다',
      pen: '손가락으로 그리면 화면에 그려집니다',
    } as Record<Tool, string>,
    pens: { red: '빨강', yellow: '노랑', blue: '파랑', white: '흰색' },
    sound: (cue: string) => `${cue} 소리는 컴퓨터에서 납니다`,
    slides: [
      { kind: 'title', title: '데모데이', sub: '우리가 만든 것, 앞으로 만들 것' },
      { kind: 'statement', title: '발표하다 말고 노트북으로 돌아가는 일', sub: '한 번 돌아갈 때마다 청중의 눈도 같이 따라갑니다.' },
      { kind: 'chart', title: '주간 사용자' },
      { kind: 'three', title: '세 가지만 기억해 주세요', items: ['넘기기', '가리키기', '효과'] },
      { kind: 'end', title: '감사합니다', sub: '질문 받겠습니다' },
    ] as SlideCopy[],
  },
  cue: {
    confetti: '꽃가루',
    drumroll: '두구두구',
    applause: '박수',
    fireworks: '불꽃놀이',
    micdrop: '마이크 드롭',
    correct: '딩동댕',
    wrong: '땡',
  } as Record<Cue, string>,
  steps: {
    title: ['파일을 열고,', 'QR을 찍고,', '발표합니다.'],
    items: [
      { title: '컴퓨터에서 파일 열기', body: 'PDF, 이미지, PowerPoint, Keynote 파일을 앱으로 끌어다 놓습니다.' },
      { title: '폰으로 QR 찍기', body: '폰과 컴퓨터가 같은 와이파이에 있으면, 앱에 뜬 QR을 카메라로 찍는 것으로 연결이 끝납니다.' },
      { title: '발표하기', body: '노트북에는 발표자 보기가, 프로젝터에는 슬라이드만 나갑니다. 넘기고 가리키는 건 폰으로.' },
    ],
    file: '발표.pptx',
    drop: '여기로 끌어 놓기',
  },
  presenter: {
    title: ['노트북에는 발표자 보기,', '화면에는 슬라이드만'],
    body: '지금 장과 다음 장, 타이머, 메모, 장 목록은 노트북에만 보입니다. 노트북이 프로젝터를 미러링하고 있으면 발표하는 동안만 확장 모드로 바꿨다가, 끝나면 원래대로 돌려놓습니다.',
    live: '발표 중',
    next: '다음 장',
    notes: '여기서 잠깐 멈추고, 그래프 오른쪽 끝을 가리킨다.',
    laptop: '노트북',
    projector: '프로젝터',
  },
  tools: {
    title: ['레이저, 스포트라이트,', '돋보기, 펜'],
    body: '폰 화면의 슬라이드를 누른 채 움직이면 청중 화면에 그대로 나타납니다. 장 목록에서 아무 장으로나 바로 가고, 잠깐 검은 화면이나 흰 화면으로 가릴 수도 있습니다.',
    hint: {
      laser: '누른 채 움직이면 레이저가 따라갑니다',
      spotlight: '누른 곳 주변만 밝게 비춥니다',
      magnify: '누른 곳을 크게 보여 줍니다',
      pen: '그린 것은 장을 넘기면 지워집니다',
    } as Record<Tool, string>,
  },
  iphone: {
    title: ['아이폰은', '볼륨 버튼으로 넘깁니다'],
    body: '설정에서 켜 두면 볼륨 올리기는 다음 장, 내리기는 이전 장입니다. 넘길 때마다 짧게 진동하고, 발표하는 동안 화면이 꺼지지 않습니다.',
    air: '에어 포인터',
    airBody: '슬라이드를 누른 채 폰을 기울이면 레이저가 따라 움직입니다.',
    up: '다음',
    down: '이전',
  },
  effects: {
    title: ['꽃가루, 두구두구,', '딩동댕'],
    body: '분위기를 띄울 순간에는 효과를 씁니다. 폰에서 꾹 누르거나 컴퓨터에서 키를 누르고 있는 동안 이어지고, 떼면 마무리됩니다. 두구두구는 누르는 동안 북을 굴리다가 손을 떼면 심벌이 울립니다.',
    try: '키를 누르고 있거나, 아래 버튼을 꾹 눌러 보세요.',
    tryTouch: '아래 버튼을 꾹 눌러 보세요.',
    silent: '소리는 컴퓨터에서 납니다. 이 페이지에서는 움직임만 보여 드립니다.',
  },
  more: [
    {
      lead: 'PowerPoint와 Keynote도 그대로.',
      rest: '컴퓨터에 있는 PowerPoint나 Keynote로 PDF를 만들어 열고, 발표자 노트는 장별 메모로 가져옵니다.',
    },
    {
      lead: 'AI와 대본 쓰기.',
      rest: '앱이 이 컴퓨터 안에서만 열리는 MCP 서버를 띄웁니다. Claude Code, Codex, Claude Desktop이 슬라이드를 읽고 장별 메모를 같이 씁니다.',
    },
    {
      lead: '남은 시간은 진동으로.',
      rest: '목표 시간을 정해 두면 5분 남았을 때, 1분 남았을 때, 시간을 넘겼을 때 폰이 진동합니다.',
    },
    {
      lead: '메모는 폰에서도.',
      rest: '장별 메모가 폰 리모컨에도 떠서 노트북을 내려다보지 않아도 됩니다.',
    },
    {
      lead: '한국어와 영어.',
      rest: '데스크톱 앱과 폰 리모컨 모두 두 언어로 쓸 수 있습니다.',
    },
    {
      lead: '무료.',
      rest: '광고도, 결제도, 가입도 없습니다.',
    },
  ],
  privacy: {
    title: ['발표 자료는', '이 방을 나가지 않습니다'],
    body: '폰과 컴퓨터는 같은 와이파이 안에서 직접 이야기합니다. 계정도, 서버도, 업로드도 없고, 연결은 QR에 담긴 연결 열쇠로만 열립니다.',
    link: '개인정보 처리방침 보기',
  },
  platforms: {
    title: ['맥, 윈도우,', '아이폰, 안드로이드'],
    rows: {
      mac: '발표 앱. 발표자 보기와 청중 화면, 폰 연결이 여기서 돌아갑니다.',
      windows: '발표 앱. 맥과 똑같이 발표자 보기와 청중 화면, 폰 연결을 맡습니다.',
      ios: '리모컨 앱. 볼륨 버튼으로 넘기기, 진동, 에어\u00a0포인터.',
      android: '설치 없이 Chrome에서. 컴퓨터 앱이 같은 와이파이로 리모컨을 내려 줍니다.',
    },
    soon: '준비 중',
    iosSoon: 'App Store 준비 중',
    noInstall: '설치 필요 없음',
  },
  faq: {
    title: '자주 묻는 질문',
    more: '더 많은 도움말은 지원 페이지에 있습니다.',
    items: [
      { q: '정말 무료인가요?', a: '네, 무료입니다. 광고와 결제, 가입이 없습니다.' },
      {
        q: '폰과 컴퓨터가 같은 와이파이에 있어야 하나요?',
        a: '네. 폰과 컴퓨터는 인터넷을 거치지 않고 같은 와이파이 안에서 직접 연결됩니다. 그래서 반응이 빠르고, 자료가 밖으로 나가지 않습니다.',
      },
      {
        q: '학교나 회사 와이파이에서는 연결이 안 돼요.',
        a: '기기끼리 서로 보지 못하게 막아 둔 와이파이가 많습니다. 폰 핫스팟을 켜고 컴퓨터를 거기에 연결한 다음, 컴퓨터 앱에 뜬 QR을 다시 찍어 보세요.',
      },
      {
        q: '.pptx 파일을 열려면 PowerPoint가 있어야 하나요?',
        a: '네. 컴퓨터에 설치된 PowerPoint나 Keynote로 PDF를 만들어 엽니다. 둘 다 없다면 발표 파일을 PDF로 내보내서 열면 됩니다.',
      },
      {
        q: '내 발표 파일이 어딘가에 올라가나요?',
        a: '아니요. 파일은 컴퓨터에만 있고, 폰에는 같은 와이파이로 슬라이드 미리보기만 보냅니다. 올라갈 서버가 처음부터 없습니다.',
      },
    ],
  },
};

export type LandingCopy = typeof ko;

const en: LandingCopy = {
  meta: {
    title: `${name} · Present from your phone`,
    description:
      'Scan one QR code and your phone becomes a presentation clicker and laser pointer. Presenter view, a vibrating timer, effects, and PowerPoint and Keynote notes. Mac and Windows, free, no account.',
  },
  hero: {
    title: ['Present from your phone.', 'Point at anything.'],
    sub: 'Scan one QR code and the phone in your hand becomes your clicker and laser pointer. Free, and no account needed.',
    android: 'Android phones need nothing installed. Scan the QR code in the desktop app and the remote opens in Chrome.',
    caption: 'Touch and drag on the slide on the phone. Tap Next to change slides.',
  },
  download: {
    mac: 'Download for Mac',
    windows: 'Download for Windows',
    ios: 'Get it on the App Store',
    names: { mac: 'Mac', windows: 'Windows', ios: 'iPhone' },
    soon: (list: string[]) => {
      const names = new Intl.ListFormat('en', { type: 'conjunction' }).format(list);
      return list.length === 1 ? `The ${names} app is coming soon.` : `${names} apps are coming soon.`;
    },
  },
  demo: {
    label: 'Interactive demo. Touch the phone screen and it shows up on the screen above.',
    screen: 'Audience screen',
    phone: 'Phone remote',
    prev: 'Back',
    next: 'Next',
    last: 'Last slide',
    clear: 'Clear',
    tool: { laser: 'Laser', spotlight: 'Spotlight', magnify: 'Zoom', pen: 'Pen' },
    hint: {
      laser: 'Touch and drag on the slide to point',
      spotlight: 'Lights up only the area you touch',
      magnify: 'Magnifies the area you touch',
      pen: 'Draw with your finger',
    },
    pens: { red: 'Red', yellow: 'Yellow', blue: 'Blue', white: 'White' },
    sound: (cue: string) => `The ${cue.toLowerCase()} sound plays from the computer`,
    slides: [
      { kind: 'title', title: 'Demo Day', sub: 'What we built, and what comes next' },
      { kind: 'statement', title: 'Walking back to the laptop mid-talk', sub: 'Every time you do, the room’s attention walks with you.' },
      { kind: 'chart', title: 'Weekly users' },
      { kind: 'three', title: 'Three things to remember', items: ['Next', 'Point', 'Effects'] },
      { kind: 'end', title: 'Thank you', sub: 'Questions welcome' },
    ],
  },
  cue: {
    confetti: 'Confetti',
    drumroll: 'Drumroll',
    applause: 'Applause',
    fireworks: 'Fireworks',
    micdrop: 'Mic drop',
    correct: 'Correct',
    wrong: 'Wrong',
  },
  steps: {
    title: ['Open the file.', 'Scan the code.', 'Present.'],
    items: [
      { title: 'Open your file on the computer', body: 'Drop a PDF, a set of images, or a PowerPoint or Keynote file into the app.' },
      { title: 'Scan the QR code', body: 'With your phone and computer on the same Wi-Fi, point your camera at the code in the app. That is the whole setup.' },
      { title: 'Present', body: 'Presenter view stays on your laptop and the projector shows only the slide. Your phone does the rest.' },
    ],
    file: 'talk.pptx',
    drop: 'Drop it here',
  },
  presenter: {
    title: ['Presenter view for you.', 'Just the slide for them.'],
    body: 'Current and next slide, timer, notes and a slide strip stay on your laptop. If your laptop is mirroring the projector, the app switches to extended mode while you present and puts it back when you finish.',
    live: 'Presenting',
    next: 'Next slide',
    notes: 'Pause here. Point at the right end of the chart.',
    laptop: 'Laptop',
    projector: 'Projector',
  },
  tools: {
    title: ['Laser, spotlight,', 'magnifier, pen'],
    body: 'Touch and drag on the slide on your phone and it shows up on the audience screen. Jump to any slide from the thumbnails, or black out or white out the screen for a moment.',
    hint: {
      laser: 'The laser follows your finger',
      spotlight: 'Lights up only the area you touch',
      magnify: 'Magnifies the area you touch',
      pen: 'Ink clears when the slide changes',
    },
  },
  iphone: {
    title: ['On iPhone,', 'the volume buttons turn slides'],
    body: 'Turn it on in settings: volume up goes forward, volume down goes back. Each change taps back with a short haptic, and the screen stays awake while you present.',
    air: 'Air pointer',
    airBody: 'Hold the slide and tilt your phone to move the laser.',
    up: 'Next',
    down: 'Back',
  },
  effects: {
    title: ['Confetti.', 'Drumroll.', 'Mic drop.'],
    body: 'For the moments that need a lift. Hold an effect on your phone, or hold its key on the computer, and it keeps going until you let go. Drumroll rolls while you hold and lands the cymbal when you release.',
    try: 'Hold a key, or press and hold a button below.',
    tryTouch: 'Press and hold a button below.',
    silent: 'Sound plays from the computer. This page shows the motion only.',
  },
  more: [
    {
      lead: 'PowerPoint and Keynote, too.',
      rest: 'The app makes a PDF with the PowerPoint or Keynote on your computer, and brings speaker notes in as slide notes.',
    },
    {
      lead: 'Write your script with AI.',
      rest: 'The app runs an MCP server that only listens on your computer. Claude Code, Codex or Claude Desktop can read your slides and write speaker notes with you.',
    },
    {
      lead: 'Time, by vibration.',
      rest: 'Set a goal and your phone vibrates at 5 minutes left, 1 minute left, and when you go over.',
    },
    {
      lead: 'Notes on your phone.',
      rest: 'Your slide notes show on the remote too, so you never have to look down at the laptop.',
    },
    {
      lead: 'Korean and English.',
      rest: 'The desktop app and the phone remote both speak the two languages.',
    },
    {
      lead: 'Free.',
      rest: 'No ads, no payments, no sign-up.',
    },
  ],
  privacy: {
    title: ['Your slides', 'never leave the room'],
    body: 'Your phone and computer talk directly over the same Wi-Fi. No account, no server, no upload, and the connection only opens with the pairing key inside the QR code.',
    link: 'Read the privacy policy',
  },
  platforms: {
    title: ['Mac, Windows,', 'iPhone, Android'],
    rows: {
      mac: 'The presenter app. Presenter view, the audience screen and phone pairing live here.',
      windows: 'The presenter app. Same as on Mac: presenter view, the audience screen and phone pairing.',
      ios: 'The remote app. Volume buttons, haptics and air pointer.',
      android: 'Nothing to install. The desktop app serves the remote to Chrome over your Wi-Fi.',
    },
    soon: 'Coming soon',
    iosSoon: 'Coming to the App Store',
    noInstall: 'No install needed',
  },
  faq: {
    title: 'Questions',
    more: 'More answers on the support page.',
    items: [
      { q: 'Is it really free?', a: 'Yes. No ads, no payments, no sign-up.' },
      {
        q: 'Do my phone and computer need to be on the same Wi-Fi?',
        a: 'Yes. They connect to each other directly inside that Wi-Fi, without going through the internet. That keeps it fast, and keeps your slides on your network.',
      },
      {
        q: 'It won’t connect on my school or office Wi-Fi.',
        a: 'Many networks stop devices from seeing each other. Turn on your phone’s hotspot, join it from your computer, then scan the QR code in the desktop app again.',
      },
      {
        q: 'Do I need PowerPoint to open a .pptx file?',
        a: 'Yes. The app makes a PDF using PowerPoint or Keynote on your computer. If you have neither, export the presentation to PDF and open that.',
      },
      {
        q: 'Is my presentation uploaded anywhere?',
        a: 'No. The file stays on your computer, and your phone only receives slide previews over your Wi-Fi. There is no server to upload to.',
      },
    ],
  },
};

export const landing: Record<'ko' | 'en', LandingCopy> = { ko, en };
