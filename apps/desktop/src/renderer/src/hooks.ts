import { useEffect, useRef, useState } from 'react';
import type { DeckInfo, PresentationState } from '@pointer/protocol';
import { messages, type Locale, type Messages } from '@pointer/i18n';
import type { ConnectionInfo } from '../../shared/ipc';
import { loadDeck, type LoadedDeck } from './deck/loadDeck';

const api = () => window.pointer;

export function usePresentationState(): PresentationState | null {
  const [state, setState] = useState<PresentationState | null>(null);
  useEffect(() => {
    let alive = true;
    void api().getState().then((s) => alive && setState(s));
    const off = api().onState(setState);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}

export function useMessages(): { t: Messages; locale: Locale } {
  const [locale, setLocale] = useState<Locale>(() => (navigator.language.startsWith('ko') ? 'ko' : 'en'));
  useEffect(() => {
    void api().getLocale().then(setLocale);
    return api().onLocale(setLocale);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return { t: messages(locale), locale };
}

export function useConnection(): ConnectionInfo | null {
  const [conn, setConn] = useState<ConnectionInfo | null>(null);
  useEffect(() => {
    void api().getConnection().then(setConn);
    return api().onConnection(setConn);
  }, []);
  return conn;
}

/** 지금 열린 자료를 이 창에서도 연다. 자료가 바뀌면 이전 것은 정리한다 */
export function useLoadedDeck(info: DeckInfo | null): LoadedDeck | null {
  const [deck, setDeck] = useState<LoadedDeck | null>(null);
  const id = info?.id ?? null;
  const pagesRef = useRef(info?.pages);
  pagesRef.current = info?.pages;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let loaded: LoadedDeck | null = null;
    void (async () => {
      const source = await api().getSource();
      if (cancelled || !source || source.id !== id) return;
      const password = await api().getPassword(id);
      const r = await loadDeck(source, password, pagesRef.current);
      if (!r.ok) return;
      if (cancelled) return r.deck.destroy();
      loaded = r.deck;
      setDeck(r.deck);
    })();
    return () => {
      cancelled = true;
      loaded?.destroy();
      setDeck(null);
    };
  }, [id]);

  return deck;
}

/** 썸네일 JPEG 를 blob URL 로. 컴포넌트가 사라지면 URL 을 회수한다 */
export function useThumb(deckId: string | null, index: number): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!deckId) return;
    let alive = true;
    let made: string | null = null;
    void api()
      .getThumb(deckId, index)
      .then((bytes) => {
        if (!alive || !bytes) return;
        made = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
        setUrl(made);
      });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
      setUrl(null);
    };
  }, [deckId, index]);
  return url;
}

/** 연결된 모니터 개수 (발표 중 "화면 바꾸기" 를 보여 줄지) */
export function useDisplayCount(): number {
  const [n, setN] = useState(1);
  useEffect(() => {
    void api().getDisplays().then(setN);
    return api().onDisplays(setN);
  }, []);
  return n;
}

/** 발표자 보기 창이 전체화면인지 */
export function useFullscreen(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    void api().getFullscreen().then(setOn);
    return api().onFullscreen(setOn);
  }, []);
  return on;
}

/** 데스크톱 시계 기준 현재 시각을 interval 마다 갱신 */
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** 방향키·클리커·B/W 키. 입력칸에 타이핑 중일 때는 무시한다 */
export function usePresentationKeys(opts: { total: number; blank: string; onEscape?: () => void; onFullscreen?: () => void }) {
  const ref = useRef(opts);
  ref.current = opts;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const { total, blank, onEscape, onFullscreen } = ref.current;
      const cmd = api().command;
      // 글자 키는 e.code 로 본다. 한글 입력 상태면 e.key 가 'ㅠ' 같은 글자로 들어온다.
      switch (e.code) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case 'Space':
        case 'Enter':
        case 'NumpadEnter':
        case 'KeyN':
          cmd({ t: 'nav', dir: 1 });
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
        case 'Backspace':
        case 'KeyP':
          cmd({ t: 'nav', dir: -1 });
          break;
        case 'Home':
          cmd({ t: 'goto', index: 0 });
          break;
        case 'End':
          cmd({ t: 'goto', index: Math.max(0, total - 1) });
          break;
        case 'KeyB':
        case 'Period':
          cmd({ t: 'blank', blank: blank === 'black' ? 'none' : 'black' });
          break;
        case 'KeyW':
        case 'Comma':
          cmd({ t: 'blank', blank: blank === 'white' ? 'none' : 'white' });
          break;
        case 'Escape':
          if (!onEscape) return;
          onEscape();
          break;
        case 'KeyF':
          if (!onFullscreen) return;
          onFullscreen();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
