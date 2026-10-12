import { defineConfig } from 'astro/config';
import { site } from './src/site';

// canonical·og 주소에 쓰는 절대 주소. site.ts 에 도메인을 적으면 그것, 아니면 Vercel 이 빌드 때 주는 주소
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const origin = site.url ?? (vercel ? `https://${vercel}` : 'http://localhost:5180');

export default defineConfig({
  site: origin,
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  server: { port: 5180 },
  vite: {
    // 파비콘 SVG 가 페이지마다 data: 로 박히지 않게 파일로 둔다
    build: { assetsInlineLimit: 0 },
    // 저장소가 node-linker=hoisted 라 맨 위 node_modules 의 cookie 는 다른 앱이 쓰는 0.x 다.
    // Astro 가 빌드 때 만드는 페이지 생성 코드가 그걸 잘못 집지 않도록 cookie 는 번들에 넣는다.
    environments: { prerender: { resolve: { noExternal: ['cookie'] } } },
  },
});
