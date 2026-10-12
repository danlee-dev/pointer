import { useEffect, useRef, useState } from 'react';
import type { Messages } from '@pointer/i18n';

export function PasswordSheet({ title, wrong, t }: { title: string; wrong: boolean; t: Messages }) {
  const [pw, setPw] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setPw('');
    input.current?.focus();
  }, [wrong]);

  return (
    <div className="sheet-backdrop">
      <form
        className="sheet narrow"
        role="dialog"
        aria-modal="true"
        onSubmit={(e) => {
          e.preventDefault();
          window.pointer.submitPassword(pw);
        }}
      >
        <h2 className="section-title">{t.password.title}</h2>
        <p className="muted">{t.password.sub(title)}</p>
        <input
          ref={input}
          type="password"
          className="input"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          aria-invalid={wrong}
          autoComplete="off"
        />
        {wrong && <p className="error-text small">{t.password.wrong}</p>}
        <div className="confirm-actions">
          <button type="button" className="btn" onClick={() => window.pointer.submitPassword(null)}>
            {t.cancel}
          </button>
          <button type="submit" className="btn primary" disabled={!pw}>
            {t.password.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
