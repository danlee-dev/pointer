import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// 워크스페이스 패키지는 TS 소스 그대로라 main 번들에 같이 넣어야 한다 (외부 모듈로 빼면 실행이 안 된다)
const workspace = ['@pointer/protocol', '@pointer/i18n'];
// 저장소가 node-linker=hoisted 라 패키지가 맨 위 node_modules 에 있어서, electron-builder 가 이걸 못 찾고
// 설치 파일에서 빠뜨린다 (켜자마자 Cannot find module). 순수 JS 의존성은 main 번들에 같이 넣는다.
// ws 는 선택적 네이티브 모듈(bufferutil)을 try/require 로 찾아서 번들하지 않고 그대로 둔다 (electron-builder 가 잘 넣는다).
const bundled = ['qrcode', 'fflate', '@modelcontextprotocol/sdk', 'zod'];

export default defineConfig({
  main: {
    build: { externalizeDeps: { exclude: [...workspace, ...bundled] } },
  },
  preload: {
    // sandbox 렌더러의 preload 는 파일 하나로 묶여 있어야 한다
    build: { externalizeDeps: false },
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          audience: resolve(__dirname, 'src/renderer/audience.html'),
          worker: resolve(__dirname, 'src/renderer/worker.html'),
        },
      },
    },
  },
});
