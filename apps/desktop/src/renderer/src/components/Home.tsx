// 자료가 열리기 전 첫 화면: 왼쪽은 자료 열기 + 최근 자료, 오른쪽은 폰 연결.

import { useEffect, useState } from 'react';
import type { Locale, Messages } from '@pointer/i18n';
import type { ConnectionInfo, OpenResult, RecentItem } from '../../../shared/ipc';
import { ConnectPanel } from './ConnectPanel';

interface Props {
  t: Messages;
  locale: Locale;
  conn: ConnectionInfo | null;
  dragging: boolean;
  onResult: (r: OpenResult) => void;
}

function folderOf(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts.slice(-3, -1).join('/');
}

function ago(ts: number, locale: Locale): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const min = Math.round((ts - Date.now()) / 60_000);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(h, 'hour');
  return rtf.format(Math.round(h / 24), 'day');
}

export function Home({ t, locale, conn, dragging, onResult }: Props) {
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const api = window.pointer;

  const reload = () => void api.getRecent().then(setRecent);
  useEffect(reload, []);

  return (
    <main className="home">
      <section className="home-main">
        <div className={dragging ? 'drop over' : 'drop'}>
          <div className="orb" aria-hidden="true" />
          <h1 className="display-title">{t.home.dropTitle}</h1>
          <p className="muted">{t.home.dropSub}</p>
          <button className="btn primary big" onClick={() => void api.openDialog().then(onResult)}>
            {t.home.open}
          </button>
        </div>

        <div className="recent-card">
          <h2 className="section-title">{t.home.recent}</h2>
          {recent.length === 0 ? (
            <p className="muted">{t.home.recentEmpty}</p>
          ) : (
            <ul className="rows recent">
              {recent.map((r) => (
                <li key={r.paths.join('|')} className="row">
                  <button
                    className="row-main recent-open"
                    disabled={r.missing}
                    onClick={() => void api.openRecent(r.paths).then(onResult)}
                  >
                    <span className="recent-title">{r.title}</span>
                    <span className="muted small">
                      {r.missing ? t.home.missing : `${t.home.pages(r.pages)} · ${ago(r.openedAt, locale)} · ${folderOf(r.paths[0] ?? '')}`}
                    </span>
                  </button>
                  <button
                    className="btn-text"
                    aria-label={t.home.remove}
                    title={t.home.remove}
                    onClick={() => void api.removeRecent(r.paths).then(reload)}
                  >
                    {t.home.remove}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside className="home-side">
        <ConnectPanel conn={conn} t={t} />
      </aside>
    </main>
  );
}
