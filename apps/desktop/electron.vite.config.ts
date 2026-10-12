import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// 워크스페이스 패키지는 TS 소스 그대로라 main 번들에 같이 넣어야 한다 (외부 모듈로 빼면 실행이 안 된다)
const workspace = ['@pointer/protocol', '@pointer/i18n'];

export default defineConfig({
  main: {
    build: { externalizeDeps: { exclude: workspace } },
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
