import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 데스크톱 앱 안 HTTP 서버가 dist 를 / 에 그대로 내려준다
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { target: 'es2020', assetsInlineLimit: 0 },
});
