// AI(MCP) 연결 안내. 도구마다 붙여 넣을 한 줄(또는 설정 JSON)을 보여 주고 복사하게 한다.

import { useEffect, useState } from 'react';
import type { Messages } from '@pointer/i18n';
import type { AiConnection } from '../../../shared/ipc';

type Client = 'claudeCode' | 'codex' | 'desktop';

function snippet(client: Client, url: string): string {
  if (client === 'claudeCode') return `claude mcp add --transport http pointer "${url}"`;
  if (client === 'codex') return `codex mcp add pointer --url "${url}"`;
  return JSON.stringify({ mcpServers: { pointer: { command: 'npx', args: ['-y', 'mcp-remote', url] } } }, null, 2);
}

const LABEL: Record<Client, string> = { claudeCode: 'Claude Code', codex: 'Codex', desktop: 'Claude Desktop' };

export function AiPanel({ t }: { t: Messages }) {
  const [conn, setConn] = useState<AiConnection | null>(null);
  const [client, setClient] = useState<Client>('claudeCode');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void window.pointer.getAiConnection().then(setConn);
  }, []);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  if (!conn?.url) return null;
  const code = snippet(client, conn.url);
  const how = client === 'claudeCode' ? t.ai.howClaudeCode : client === 'codex' ? t.ai.howCodex : t.ai.howDesktop;

  return (
    <div className="ai-panel">
      <h2 className="section-title">{t.ai.title}</h2>
      <p className="muted">{t.ai.sub}</p>
      <div className="seg" role="tablist">
        {(Object.keys(LABEL) as Client[]).map((c) => (
          <button key={c} role="tab" aria-selected={c === client} className={c === client ? 'seg-item on' : 'seg-item'} onClick={() => setClient(c)}>
            {LABEL[c]}
          </button>
        ))}
      </div>
      <div className="code">
        <pre>{code}</pre>
        <button
          className="btn code-copy"
          onClick={() => {
            window.pointer.copyText(code);
            setCopied(true);
          }}
        >
          {copied ? t.ai.copied : t.ai.copy}
        </button>
      </div>
      <p className="subtle small help">{how}</p>
    </div>
  );
}
