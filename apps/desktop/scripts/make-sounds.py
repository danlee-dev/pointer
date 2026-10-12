# 두구두구 녹음 파일 만들기: Freesound 의 CC0 팀파니 녹음 -> public/sounds/*.flac
#
#   python3 -m venv /tmp/snd && /tmp/snd/bin/pip install numpy
#   /tmp/snd/bin/python apps/desktop/scripts/make-sounds.py
#
# 필요한 것: ffmpeg, numpy. 원본은 Freesound 미리듣기(-hq.mp3, CC0)를 받아 쓴다. 출처는 docs/sounds.md.
#
# 하는 일
#   1. 롤 녹음의 크기 흐름을 평평하게 편다 (점점 커지는 건 앱이 따로 건다)
#   2. 고른 구간을 잘라 끝 0.3초를 시작 직전 소리와 겹쳐 섞는다 -> 되풀이해도 이음새가 안 들린다
#   3. MP3 는 앞뒤에 무음이 끼어 반복할 때 틱 소리가 나서 FLAC 으로 저장한다

import os, subprocess, sys, tempfile, urllib.request, wave
import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'renderer', 'public', 'sounds')
SOURCES = {
    'roll-a': 'https://cdn.freesound.org/previews/373/373946_2475994-hq.mp3',  # sgossner, Timpani rolls E3
    'roll-b': 'https://cdn.freesound.org/previews/428/428611_1703519-hq.mp3',  # hallkev, Timpani Roll
    'hit': 'https://cdn.freesound.org/previews/373/373935_2475994-hq.mp3',  # sgossner, Timpani E3 hit
}


def fetch(name):
    path = os.path.join(tempfile.gettempdir(), f'pointer-{name}.mp3')
    if not os.path.exists(path):
        urllib.request.urlretrieve(SOURCES[name], path)
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def rms(x):
    return float(np.sqrt(np.mean(x ** 2)) + 1e-12)


def level(x, win=0.4):
    n = int(SR * win)
    env = np.sqrt(np.convolve(x ** 2, np.ones(n) / n, mode='same')) + 1e-6
    g = np.clip(np.median(env) / env, 0.3, 4)
    return x * np.convolve(g, np.ones(n) / n, mode='same')


def seamless(x, a, b, xf=0.3):
    a, b, n = int(a * SR), int(b * SR), int(xf * SR)
    out = x[a:b].copy()
    t = np.linspace(0, 1, n)
    out[-n:] = out[-n:] * np.cos(t * np.pi / 2) + x[a - n:a] * np.sin(t * np.pi / 2)
    return out


def save(name, y):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    tmp = path + '.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-c:a', 'flac', '-compression_level', '8', path], check=True)
    os.remove(tmp)
    print(f'{name}: {len(y) / SR:.2f}s, {os.path.getsize(path) // 1024}KB')


LOOP_RMS = 10 ** (-20 / 20)
# 구간은 녹음을 0.25초 단위로 재서 크기가 고른 곳으로 골랐다
for name, (a, b) in {'roll-a': (1.0, 5.0), 'roll-b': (2.8, 6.5)}.items():
    loop = seamless(level(fetch(name)), a, b)
    save(f'timpani-{name}.flac', loop * (LOOP_RMS / rms(loop)))

h = fetch('hit')
start = max(0, int(np.argmax(np.abs(h) > np.abs(h).max() * 0.05)) - int(0.005 * SR))
h = h[start:start + int(3.5 * SR)]
fade = int(0.8 * SR)
h[-fade:] *= np.linspace(1, 0, fade) ** 2
save('timpani-hit.flac', h * (10 ** (-2 / 20) / np.abs(h).max()))
sys.exit(0)
