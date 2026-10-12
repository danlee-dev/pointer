// 개인정보 처리방침. App Store 심사에 이 주소를 낸다.
// 바뀌면 site.ts 의 privacyEffective 날짜도 같이 바꾼다.

import { site } from '../site';

const name = site.name;

export interface PolicySection {
  id: string;
  h: string;
  p?: string[];
  list?: string[];
  link?: { label: string; href: string };
}

export interface PolicyCopy {
  meta: { title: string; description: string };
  title: string;
  effective: (date: string) => string;
  intro: string;
  sections: PolicySection[];
}

const ko: PolicyCopy = {
  meta: {
    title: `개인정보 처리방침 · ${name}`,
    description: `${name} 앱은 개인정보를 모으지 않습니다. 계정, 분석 도구, 광고가 없고 발표 파일은 컴퓨터에만 있습니다.`,
  },
  title: '개인정보 처리방침',
  effective: (date) => {
    const [y, m, d] = date.split('-').map(Number);
    return `시행일 ${y}년 ${m}월 ${d}일`;
  },
  intro: `${name} 앱은 개인정보를 모으지 않습니다. 이 방침은 데스크톱 앱(맥·윈도우), 아이폰 앱, 그리고 안드로이드 폰에서 여는 웹 리모컨에 모두 적용됩니다.`,
  sections: [
    {
      id: 'summary',
      h: '한눈에 보기',
      list: [
        '개인정보를 모으거나, 서버에 저장하거나, 다른 곳에 넘기지 않습니다.',
        '계정, 분석 도구, 광고가 없습니다.',
        '발표 파일은 사용자의 컴퓨터에만 있습니다.',
        '폰과 컴퓨터는 같은 로컬 네트워크 안에서 직접 연결됩니다.',
      ],
    },
    {
      id: 'not-collected',
      h: '모으지 않는 것',
      p: [
        '앱에는 회원 가입이나 로그인이 없습니다. 사용 기록을 분석하는 도구나 광고 SDK도 넣지 않았습니다. 그래서 이름, 이메일, 기기 식별자, 위치, 사용 기록 같은 정보를 저희가 받거나 보관하지 않습니다.',
      ],
    },
    {
      id: 'files',
      h: '발표 파일',
      p: [
        '여는 PDF, 이미지, PowerPoint, Keynote 파일은 사용자의 컴퓨터 안에서만 처리됩니다. PowerPoint나 Keynote 파일은 그 컴퓨터에 설치된 PowerPoint 또는 Keynote로 PDF를 만들어 열고, 만든 PDF는 같은 컴퓨터에 보관합니다. 어떤 파일도 외부 서버로 보내지 않습니다.',
      ],
    },
    {
      id: 'connection',
      h: '폰과 컴퓨터의 연결',
      p: [
        '폰은 같은 와이파이(로컬 네트워크) 안에서 컴퓨터에 직접 연결합니다. 중간에 거치는 서버는 없습니다.',
        '연결할 때는 QR 코드에 담긴 연결 열쇠(페어링 토큰)를 확인해서, 그 QR을 찍은 폰만 연결되게 합니다. 컴퓨터 앱에서 QR을 새로 만들면 예전 열쇠로는 더 이상 연결할 수 없습니다.',
        '이 연결로 오가는 것은 장 넘기기와 레이저 위치 같은 조작, 슬라이드 미리보기, 장별 메모뿐이며 모두 그 네트워크 안에 머뭅니다.',
      ],
    },
    {
      id: 'permissions',
      h: '폰에서 쓰는 권한',
      list: [
        '카메라: 연결용 QR 코드를 찍을 때만 씁니다. 찍은 화면은 저장하지 않습니다.',
        '움직임 센서: 에어 포인터(폰을 기울여 레이저를 옮기는 기능)를 쓸 때만 읽고, 폰 안에서만 처리합니다.',
        '로컬 네트워크: 같은 와이파이에 있는 컴퓨터를 찾아 연결하는 데 필요합니다.',
      ],
    },
    {
      id: 'on-device',
      h: '기기 안에 남는 것',
      p: [
        '편하게 쓰도록 몇 가지를 그 기기 안에만 저장합니다. 컴퓨터에는 설정, 최근에 연 자료 목록, 장별 메모, 연결 열쇠, PowerPoint·Keynote에서 만든 PDF를 둡니다. 아이폰에는 마지막으로 연결한 컴퓨터와 설정, 같은 폰을 알아보기 위한 임의의 번호를 둡니다.',
        '이 정보는 기기 밖으로 나가지 않습니다. 아이폰에서는 앱을 지우면 함께 지워지고, 컴퓨터에서는 앱의 데이터 폴더를 지우면 사라집니다.',
      ],
    },
    {
      id: 'ai',
      h: 'AI 기능 (선택)',
      p: [
        'AI와 대본 쓰기를 위해 데스크톱 앱은 MCP 서버를 엽니다. 이 서버는 그 컴퓨터 자신(127.0.0.1)에서 오는 연결만 받고, 앱이 보여 주는 연결 주소(열쇠 포함)를 넣은 도구만 쓸 수 있습니다.',
        '여기에 연결하는 AI 도구(Claude Code, Codex, Claude Desktop 등)는 사용자가 직접 고르고 설치한 것이며, 그 도구가 읽은 슬라이드와 메모는 그 도구를 만든 회사의 방침에 따라 처리됩니다. AI 도구를 직접 연결하지 않으면 아무것도 연결되지 않습니다.',
      ],
    },
    {
      id: 'website',
      h: '이 웹사이트',
      p: [
        '이 웹사이트도 쿠키, 분석 도구, 광고를 쓰지 않습니다. 사이트를 내려 주는 호스팅 서비스가 운영과 보안을 위해 일반적인 접속 기록을 남길 수 있습니다.',
      ],
    },
    {
      id: 'contact',
      h: '문의',
      p: ['개인정보에 관해 궁금한 점은 GitHub Issues에 남겨 주세요. GitHub 계정이 필요합니다.'],
      link: { label: 'GitHub Issues 열기', href: site.support },
    },
    {
      id: 'changes',
      h: '방침이 바뀌면',
      p: ['이 방침을 바꾸면 이 페이지에 새 내용과 시행일을 올립니다.'],
    },
  ],
};

const en: PolicyCopy = {
  meta: {
    title: `Privacy Policy · ${name}`,
    description: `The ${name} apps do not collect personal data. No accounts, no analytics, no ads, and your presentation files stay on your computer.`,
  },
  title: 'Privacy Policy',
  effective: (date) => {
    const d = new Date(`${date}T00:00:00Z`);
    return `Effective ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}`;
  },
  intro: `The ${name} apps do not collect personal data. This policy covers the desktop app (Mac and Windows), the iPhone app, and the web remote that opens on Android phones.`,
  sections: [
    {
      id: 'summary',
      h: 'At a glance',
      list: [
        'We do not collect personal data, store it on servers, or share it with anyone.',
        'There are no accounts, no analytics and no ads.',
        'Your presentation files stay on your computer.',
        'Your phone and computer connect directly inside your local network.',
      ],
    },
    {
      id: 'not-collected',
      h: 'What we do not collect',
      p: [
        'There is no sign-up or sign-in. We have not added analytics tools or advertising SDKs. So we never receive or keep information such as your name, email, device identifiers, location or usage history.',
      ],
    },
    {
      id: 'files',
      h: 'Your presentation files',
      p: [
        'PDFs, images, PowerPoint and Keynote files you open are processed only on your computer. PowerPoint and Keynote files are turned into PDFs using the PowerPoint or Keynote installed on that computer, and the PDFs are kept on the same computer. No file is sent to an outside server.',
      ],
    },
    {
      id: 'connection',
      h: 'How your phone and computer connect',
      p: [
        'Your phone connects to your computer directly over the same Wi-Fi (local network). No server sits in between.',
        'When connecting, the app checks the pairing token inside the QR code, so only phones that scanned that code can connect. If you make a new QR code in the desktop app, the old token stops working.',
        'The connection carries only remote controls such as slide changes and laser position, slide previews, and your slide notes, and all of it stays on that network.',
      ],
    },
    {
      id: 'permissions',
      h: 'Permissions on your phone',
      list: [
        'Camera: used only to scan the pairing QR code. Camera images are not stored.',
        'Motion sensors: read only while you use the air pointer (tilting the phone to move the laser), and processed on the phone.',
        'Local network: needed to find and connect to the computer on your Wi-Fi.',
      ],
    },
    {
      id: 'on-device',
      h: 'What stays on your devices',
      p: [
        'To make the apps convenient, a few things are saved on the device itself. On your computer: settings, the list of recent files, slide notes, the pairing token, and PDFs made from PowerPoint or Keynote files. On your iPhone: the last computer you connected to, settings, and a random number used to recognize the same phone.',
        'None of this leaves the device. On iPhone it is removed when you delete the app; on a computer it is removed when you delete the app’s data folder.',
      ],
    },
    {
      id: 'ai',
      h: 'AI features (optional)',
      p: [
        'For writing scripts with AI, the desktop app opens an MCP server. It only accepts connections from the computer itself (127.0.0.1), and only from tools given the connection address (with its key) that the app shows you.',
        'The AI client you connect to it, such as Claude Code, Codex or Claude Desktop, is one you chose and installed. Slides and notes it reads are handled under the policy of the company that makes it. If you do not connect an AI client yourself, nothing is connected.',
      ],
    },
    {
      id: 'website',
      h: 'This website',
      p: [
        'This website does not use cookies, analytics or ads either. The hosting service that serves it may keep standard access logs for operation and security.',
      ],
    },
    {
      id: 'contact',
      h: 'Contact',
      p: ['For privacy questions, open an issue on GitHub Issues. A GitHub account is required.'],
      link: { label: 'Open GitHub Issues', href: site.support },
    },
    {
      id: 'changes',
      h: 'Changes to this policy',
      p: ['If this policy changes, the new version and its effective date will be posted on this page.'],
    },
  ],
};

export const privacy: Record<'ko' | 'en', PolicyCopy> = { ko, en };
