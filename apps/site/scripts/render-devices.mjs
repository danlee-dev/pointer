// 첫 화면 기기 이미지 렌더러를 띄우는 작은 서버.
//
//   1. 3D 모델(.glb)을 apps/site/.models/ 에 둔다 (저장소에 올리지 않는다, .gitignore)
//      - apple_iphone_15_pro_max_black.glb  : Sketchfab, polyman, CC BY 4.0
//      - macbook_pro_14_inch_m5_black.glb   : Sketchfab Standard (파일 재배포 금지, 렌더 이미지로만 쓴다)
//   2. node apps/site/scripts/render-devices.mjs
//   3. 브라우저로 http://127.0.0.1:5190/?scale=1.5&only=macbook&save=1 , ?scale=1&only=iphone&save=1
//      -> apps/site/.models/out/{macbook,iphone}.png 와 화면 자리 .json
//   4. cwebp -q 86 -alpha_q 100 -resize 1800 0 macbook.png -o public/devices/macbook.webp (아이폰은 760)
//   5. .json 의 quad 를 src/data/devices.ts 에 옮긴다
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MODELS = path.join(HERE, '..', '.models');
const THREE = path.join(HERE, '..', '..', '..', 'node_modules', 'three');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/save') {
      const name = path.basename(url.searchParams.get('name') ?? 'out');
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        let body = Buffer.concat(chunks);
        if (name.endsWith('.png')) body = Buffer.from(body.toString().replace(/^data:image\/png;base64,/, ''), 'base64');
        fs.mkdirSync(path.join(MODELS, 'out'), { recursive: true });
        fs.writeFileSync(path.join(MODELS, 'out', name), body);
        res.end('ok');
      });
      return;
    }
    const file = url.pathname.startsWith('/three/')
      ? path.join(THREE, url.pathname.slice(7))
      : url.pathname.startsWith('/models/')
        ? path.join(MODELS, path.basename(url.pathname))
        : path.join(HERE, 'render-devices.html');
    fs.readFile(file, (err, data) => {
      if (err) {
        res.statusCode = 404;
        return res.end('not found');
      }
      res.setHeader('content-type', types[path.extname(file)] ?? 'application/octet-stream');
      res.end(data);
    });
  })
  .listen(5190, '127.0.0.1', () => console.log('http://127.0.0.1:5190/'));
