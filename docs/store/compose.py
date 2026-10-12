# App Store 스크린샷 꾸미기: 원본(docs/store/screenshots/raw, 1320x2868)을 아이폰 렌더 화면 자리에 넣고 위에 제목.
# 쓰는 법: python3 docs/store/compose.py <아이폰 렌더 png> <렌더 json>
#   (렌더는 apps/site/scripts/render-devices.mjs 로 만든다. 모델 파일은 저장소에 없다)
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
FONT = os.path.join(ROOT, 'node_modules', 'pretendard', 'dist', 'public', 'static')
W, H = 1320, 2868
SCREEN_RADIUS = 35 / 290  # 화면 폭 대비 모서리 반지름 (apps/site/src/data/devices.ts 와 같은 값)

SHOTS = [
    ('01-remote', '폰으로 넘기고,\n펜으로 짚고', '발표 메모와 남은 시간까지 손 안에'),
    ('02-effects', '두구두구부터\n딩동댕까지', '누르고 있는 동안 이어지는 발표 효과'),
    ('03-jump', '몇 번째 장이든\n바로 이동', '썸네일을 보고 원하는 장으로'),
    ('04-settings', '볼륨 버튼으로\n넘기기', '넘어갈 때마다 손끝에 짧은 진동'),
]

phone_png, phone_json = sys.argv[1], sys.argv[2]
phone = Image.open(phone_png).convert('RGBA')
quad = json.load(open(phone_json))['quad']

def font(weight, size):
    return ImageFont.truetype(os.path.join(FONT, f'Pretendard-{weight}.otf'), size)

def background():
    bg = Image.new('RGBA', (W, H), (12, 10, 9, 255))
    # 위에서 떨어지는 은은한 빛 (홈페이지 무대와 같은 분위기)
    glow = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(glow)
    d.ellipse((-W * 0.3, -H * 0.35, W * 1.3, H * 0.55), fill=46)
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    light = Image.new('RGBA', (W, H), (255, 248, 238, 255))
    bg.paste(light, (0, 0), glow)
    return bg

for name, title, sub in SHOTS:
    shot = Image.open(os.path.join(HERE, 'screenshots', 'raw', f'{name}.png')).convert('RGBA')
    canvas = background()
    d = ImageDraw.Draw(canvas)

    # 제목: 가늘고 큰 글자, 자간 조금 좁게
    tf = font('Light', 124)
    y = 230
    for line in title.split('\n'):
        w = d.textlength(line, font=tf) - 0.03 * 124 * (len(line) - 1)
        x = (W - w) / 2
        for ch in line:
            d.text((x, y), ch, font=tf, fill=(250, 250, 249, 255))
            x += d.textlength(ch, font=tf) - 0.03 * 124
        y += 150
    sf = font('Regular', 52)
    sw = d.textlength(sub, font=sf)
    d.text(((W - sw) / 2, y + 26), sub, font=sf, fill=(168, 162, 158, 255))

    # 아이폰: 높이를 맞추고 화면 자리에 스크린샷을 둥근 모서리로 넣는다
    ph_h = int(H * 0.66)
    ph_w = int(phone.width * ph_h / phone.height)
    dev = phone.resize((ph_w, ph_h), Image.LANCZOS)
    sx0, sy0 = quad['tl'][0] * ph_w, quad['tl'][1] * ph_h
    sx1, sy1 = quad['br'][0] * ph_w, quad['br'][1] * ph_h
    sw_, sh_ = int(round(sx1 - sx0)), int(round(sy1 - sy0))
    scr = shot.resize((sw_, sh_), Image.LANCZOS)
    mask = Image.new('L', (sw_ * 4, sh_ * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw_ * 4 - 1, sh_ * 4 - 1), radius=int(SCREEN_RADIUS * sw_ * 4), fill=255)
    mask = mask.resize((sw_, sh_), Image.LANCZOS)
    dev.paste(scr, (int(round(sx0)), int(round(sy0))), mask)
    px = (W - ph_w) // 2
    py = H - ph_h - 120
    # 기기 아래 옅은 그림자
    sh = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh).ellipse((px + ph_w * 0.15, py + ph_h - 30, px + ph_w * 0.85, py + ph_h + 60), fill=120)
    sh = sh.filter(ImageFilter.GaussianBlur(40))
    canvas.paste(Image.new('RGBA', (W, H), (0, 0, 0, 255)), (0, 0), sh)
    canvas.alpha_composite(dev, (px, py))

    out = os.path.join(HERE, 'screenshots', f'{name}.png')
    canvas.convert('RGB').save(out, optimize=True)
    print(out, canvas.size)
