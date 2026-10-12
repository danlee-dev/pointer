// 지원 페이지. App Store 심사에 이 주소를 낸다. 문의는 GitHub Issues 하나로 받는다.

import { site } from '../site';

const name = site.name;

export interface SupportTopic {
  id: string;
  h: string;
  items: { q: string; a: string }[];
}

export interface SupportCopy {
  meta: { title: string; description: string };
  title: string;
  intro: string;
  contact: { h: string; body: string; cta: string; note: string };
  topicsLabel: string;
  topics: SupportTopic[];
}

const ko: SupportCopy = {
  meta: {
    title: `지원 · ${name}`,
    description: `${name} 연결, 파일, 발표, 아이폰, AI 기능에 관한 도움말과 문의 방법.`,
  },
  title: '지원',
  intro: '막히는 곳이 있으면 아래에서 먼저 찾아보세요. 없으면 GitHub Issues에 남겨 주시면 답합니다.',
  contact: {
    h: '문의하기',
    body: '앱 버전, 컴퓨터와 폰 기종, 무엇을 하다가 어떻게 됐는지 적어 주시면 빨리 볼 수 있습니다.',
    cta: 'GitHub Issues에 남기기',
    note: 'GitHub 계정이 필요합니다. 남긴 글은 누구나 볼 수 있으니 개인정보는 적지 마세요.',
  },
  topicsLabel: '주제',
  topics: [
    {
      id: 'connect',
      h: '연결',
      items: [
        {
          q: 'QR을 찍어도 폰에서 열리지 않아요',
          a: '폰과 컴퓨터가 같은 와이파이에 있는지 먼저 확인해 주세요. 학교나 회사 와이파이는 기기끼리 서로 보지 못하게 막아 둔 경우가 많습니다. 폰 핫스팟을 켜고 컴퓨터를 거기에 연결한 다음 QR을 다시 찍어 보세요.',
        },
        {
          q: '"연결 주소가 바뀌었습니다" 라고 떠요',
          a: '컴퓨터 앱에서 QR을 새로 만들었거나 네트워크가 바뀐 경우입니다. 컴퓨터 앱에 지금 떠 있는 QR을 다시 찍어 주세요.',
        },
        {
          q: '연결이 자꾸 끊겨요',
          a: '끊기면 리모컨이 알아서 다시 연결합니다. 자주 끊긴다면 와이파이 신호가 약한 곳인지 확인하고, 가능하면 폰 핫스팟으로 연결해 보세요.',
        },
        {
          q: '다른 사람이 내 발표를 조종할 수 있나요?',
          a: 'QR에 담긴 연결 열쇠가 있어야 연결됩니다. 컴퓨터 앱에서 연결된 폰을 끊을 수 있고, QR을 새로 만들면 예전 열쇠로는 더 이상 들어올 수 없습니다.',
        },
      ],
    },
    {
      id: 'files',
      h: '파일',
      items: [
        {
          q: '어떤 파일을 열 수 있나요?',
          a: 'PDF, 이미지(PNG, JPG, WebP, GIF), PowerPoint(pptx, ppt), Keynote(key) 파일을 열 수 있습니다. 이미지는 여러 장이나 폴더째로 열면 한 장씩 넘어갑니다.',
        },
        {
          q: 'PowerPoint 파일이 열리지 않아요',
          a: 'PowerPoint와 Keynote 파일은 그 컴퓨터에 설치된 PowerPoint나 Keynote로 PDF를 만들어 엽니다. 둘 다 없다면 발표 앱에서 PDF로 내보낸 뒤 그 PDF를 열어 주세요. 처음 열 때만 조금 걸리고, 다음부터는 바로 열립니다.',
        },
        {
          q: '애니메이션이나 동영상이 재생되지 않아요',
          a: 'PDF로 바꿔서 보여 주기 때문에 장 안의 애니메이션, 전환 효과, 동영상은 재생되지 않습니다.',
        },
        {
          q: '발표자 노트는 어떻게 되나요?',
          a: 'PowerPoint와 Keynote의 발표자 노트는 장별 메모로 가져옵니다. 메모는 노트북의 발표자 보기와 폰 리모컨에 함께 보입니다.',
        },
      ],
    },
    {
      id: 'presenting',
      h: '발표 중',
      items: [
        {
          q: '노트북 화면이 프로젝터와 똑같이 나와요',
          a: '노트북이 프로젝터를 미러링하고 있으면 발표하는 동안만 확장 모드로 바꿔서 노트북에는 발표자 보기, 프로젝터에는 슬라이드만 띄웁니다. 발표를 끝내면 원래대로 돌려놓습니다.',
        },
        {
          q: '화면을 잠깐 가리고 싶어요',
          a: '폰 리모컨의 더보기에서 검은 화면이나 흰 화면으로 가릴 수 있습니다. 컴퓨터에서는 B가 검은 화면, W가 흰 화면입니다. 다음이나 이전을 누르면 다시 켜집니다.',
        },
        {
          q: '효과 소리가 들리지 않아요',
          a: '효과 소리는 컴퓨터에서 납니다. 컴퓨터 소리가 켜져 있는지, 소리가 프로젝터나 스피커 쪽으로 나가도록 출력 장치가 맞게 골라져 있는지 확인해 주세요.',
        },
        {
          q: '타이머 진동은 언제 오나요?',
          a: '목표 시간을 정해 두면 5분 남았을 때, 1분 남았을 때, 시간을 넘겼을 때 폰이 진동합니다. 타이머는 처음 장을 넘길 때 저절로 시작합니다.',
        },
      ],
    },
    {
      id: 'iphone',
      h: '아이폰과 안드로이드',
      items: [
        {
          q: '볼륨 버튼으로 넘어가지 않아요',
          a: '볼륨 버튼으로 넘기기는 처음에 꺼져 있습니다. 아이폰 앱 설정에서 켜 주세요. 켜 두는 동안은 폰 소리 크기가 중간으로 고정됩니다.',
        },
        {
          q: '에어 포인터는 어떻게 쓰나요?',
          a: '도구에서 에어를 고르고, 슬라이드를 누른 채 폰을 기울이면 레이저가 따라 움직입니다. 손을 떼면 멈춥니다.',
        },
        {
          q: '안드로이드 앱은 없나요?',
          a: '안드로이드 폰은 앱을 설치하지 않아도 됩니다. 컴퓨터 앱에 뜬 QR을 찍으면 Chrome에서 리모컨이 열립니다.',
        },
      ],
    },
    {
      id: 'ai',
      h: 'AI와 대본 쓰기',
      items: [
        {
          q: '어떤 AI 도구와 쓸 수 있나요?',
          a: 'MCP를 지원하는 Claude Code, Codex, Claude Desktop과 함께 쓸 수 있습니다. 컴퓨터 앱 홈 화면의 "AI와 대본 쓰기"에서 도구별로 붙여 넣을 한 줄을 복사하세요.',
        },
        {
          q: 'AI 기능을 쓰면 자료가 밖으로 나가나요?',
          a: '앱의 MCP 서버는 그 컴퓨터 안에서만 연결을 받습니다. 다만 연결한 AI 도구는 읽은 슬라이드와 메모를 그 도구의 방식대로 처리하니, 해당 도구의 개인정보 방침을 확인해 주세요.',
        },
      ],
    },
  ],
};

const en: SupportCopy = {
  meta: {
    title: `Support · ${name}`,
    description: `Help with connecting, files, presenting, iPhone and AI features in ${name}, and how to reach us.`,
  },
  title: 'Support',
  intro: 'If something is not working, look below first. If your answer is not here, open an issue on GitHub and we will reply there.',
  contact: {
    h: 'Contact',
    body: 'Include the app version, your computer and phone models, and what you were doing when it happened. It helps us answer faster.',
    cta: 'Open an issue on GitHub',
    note: 'A GitHub account is required. Issues are public, so please leave out personal information.',
  },
  topicsLabel: 'Topics',
  topics: [
    {
      id: 'connect',
      h: 'Connecting',
      items: [
        {
          q: 'I scanned the QR code but nothing opens on my phone',
          a: 'Check that your phone and computer are on the same Wi-Fi. School and office networks often stop devices from seeing each other. Turn on your phone’s hotspot, join it from your computer, and scan the QR code again.',
        },
        {
          q: 'It says “This link has changed”',
          a: 'A new QR code was made in the desktop app, or the network changed. Scan the QR code currently shown in the desktop app.',
        },
        {
          q: 'The connection keeps dropping',
          a: 'The remote reconnects on its own when the connection drops. If it happens often, check for weak Wi-Fi signal, or try connecting through your phone’s hotspot.',
        },
        {
          q: 'Can someone else control my presentation?',
          a: 'A phone needs the pairing key inside the QR code to connect. You can disconnect phones from the desktop app, and making a new QR code locks out the old key.',
        },
      ],
    },
    {
      id: 'files',
      h: 'Files',
      items: [
        {
          q: 'Which files can I open?',
          a: 'PDF, images (PNG, JPG, WebP, GIF), PowerPoint (pptx, ppt) and Keynote (key). Open several images or a folder of them and they become slides in order.',
        },
        {
          q: 'My PowerPoint file will not open',
          a: 'PowerPoint and Keynote files are turned into PDFs using the PowerPoint or Keynote installed on that computer. If you have neither, export to PDF from your presentation app and open the PDF. It takes a moment the first time only.',
        },
        {
          q: 'Animations and videos do not play',
          a: 'Slides are shown as a PDF, so animations, transitions and videos inside slides do not play.',
        },
        {
          q: 'What happens to my speaker notes?',
          a: 'Speaker notes from PowerPoint and Keynote come in as slide notes. They appear in presenter view on your laptop and on the phone remote.',
        },
      ],
    },
    {
      id: 'presenting',
      h: 'While presenting',
      items: [
        {
          q: 'My laptop shows the same thing as the projector',
          a: 'If your laptop is mirroring the projector, the app switches to extended mode while you present, so your laptop shows presenter view and the projector shows only the slide. It switches back when you finish.',
        },
        {
          q: 'How do I hide the screen for a moment?',
          a: 'Use More on the phone remote to black out or white out the screen. On the computer, press B for black and W for white. Next or Back brings the slides back.',
        },
        {
          q: 'I cannot hear the effects',
          a: 'Effect sounds play from the computer. Check that the computer is not muted and that its sound output is set to the projector or speakers you want.',
        },
        {
          q: 'When does the timer vibrate?',
          a: 'Set a goal and your phone vibrates at 5 minutes left, 1 minute left, and when you go over. The timer starts on its own at your first slide change.',
        },
      ],
    },
    {
      id: 'iphone',
      h: 'iPhone and Android',
      items: [
        {
          q: 'The volume buttons do not change slides',
          a: 'Volume button control starts turned off. Turn it on in the iPhone app’s settings. While it is on, your phone volume stays at the middle.',
        },
        {
          q: 'How do I use the air pointer?',
          a: 'Choose Air in the tools, then hold the slide and tilt your phone. The laser follows, and stops when you let go.',
        },
        {
          q: 'Is there an Android app?',
          a: 'Android phones need nothing installed. Scan the QR code in the desktop app and the remote opens in Chrome.',
        },
      ],
    },
    {
      id: 'ai',
      h: 'Writing with AI',
      items: [
        {
          q: 'Which AI tools work with it?',
          a: 'Claude Code, Codex and Claude Desktop, through MCP. Copy the one-line setup for your tool from “Write your script with AI” on the desktop app’s home screen.',
        },
        {
          q: 'Does using AI send my slides anywhere?',
          a: 'The app’s MCP server only accepts connections from the same computer. The AI tool you connect handles what it reads in its own way, so check that tool’s privacy policy.',
        },
      ],
    },
  ],
};

export const support: Record<'ko' | 'en', SupportCopy> = { ko, en };
