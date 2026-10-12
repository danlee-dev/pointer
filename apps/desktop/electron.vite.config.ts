import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// 워크스페이스 패키지는 TS 소스 그대로라 main 번들에 같이 넣어야 한다 (외부 모듈로 빼면 실행이 안 된다)
const workspace = ['@pointer/protocol', '@pointer/i18n'];
// 저장소가 node-linker=hoisted 라 electron-builder 가 의존성을 엉뚱하게 고른다: 빠뜨리거나 (켜자마자 Cannot find module),
// 맨 위 node_modules 에 끌어올려진 다른 버전을 넣는다 (1.0.0 첫 배포에서 ws 8 대신 7 이 들어가 WebSocketServer 가 없었다).
// 그래서 런타임 의존성은 전부 main 번들에 넣고, 설치 파일에는 node_modules 를 하나도 싣지 않는다.
const bundled = ['qrcode', 'fflate', '@modelcontextprotocol/sdk', 'zod', 'ws'];
// ws 가 try/require 로 찾는 선택적 네이티브 가속 모듈. 없으면 순수 JS 로 돈다
const optionalNative = ['bufferutil', 'utf-8-validate'];

export default defineConfig({
  main: {
    build: {
      externalizeDeps: { exclude: [...workspace, ...bundled] },
      rollupOptions: { external: optionalNative },
    },
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
