// 폰 연결: QR, 주소, 연결된 폰 목록. 홈 오른쪽과 발표자 화면의 연결 시트에서 같이 쓴다.

import { useState } from 'react';
import type { Messages } from '@pointer/i18n';
import type { ConnectionInfo } from '../../../shared/ipc';

export function ConnectPanel({ conn, t }: { conn: ConnectionInfo | null; t: Messages }) {
  const [confirming, setConfirming] = useState(false);
  const api = window.pointer;

  return (
    <div className="connect">
      <h2 className="section-title">{t.connect.title}</h2>
      <p className="muted">{t.connect.sub}</p>

      {conn?.qrSvg ? (
        <div className="qr" dangerouslySetInnerHTML={{ __html: conn.qrSvg }} aria-label={conn.url ?? ''} role="img" />
      ) : (
        <p className="warn-text">{t.connect.noNetwork}</p>
      )}
      {conn?.url && <p className="url">{conn.url}</p>}

      {conn && conn.addresses.length > 1 && (
        <label className="field">
          <span className="muted small">{t.connect.otherAddress}</span>
          <select value={conn.address ?? ''} onChange={(e) => api.setAddress(e.target.value)}>
            {conn.addresses.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="devices">
        {conn && conn.devices.length > 0 ? (
          <>
            <p className="ok-text">{t.connect.devices(conn.devices.length)}</p>
            <ul className="rows">
              {conn.devices.map((d) => (
                <li key={d.id} className="row">
                  <span className="row-text">
                    {d.name} <span className="muted small">· {t.connect.platform[d.platform]}</span>
                  </span>
                  <button className="btn-text" onClick={() => api.kickDevice(d.id)}>
                    {t.connect.kick}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">{t.connect.none}</p>
        )}
      </div>

      {confirming ? (
        <div className="confirm">
          <p className="small">{t.connect.rotateConfirm}</p>
          <div className="confirm-actions">
            <button className="btn" onClick={() => setConfirming(false)}>
              {t.cancel}
            </button>
            <button
              className="btn danger"
              onClick={() => {
                api.rotateToken();
                setConfirming(false);
              }}
            >
              {t.connect.rotate}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-text" onClick={() => setConfirming(true)}>
          {t.connect.rotate}
        </button>
      )}

      <p className="subtle small help">{t.connect.isolationHelp}</p>
    </div>
  );
}
