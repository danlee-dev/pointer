// 장별 발표 메모. 입력하는 동안은 화면 값을 믿고, 저장은 0.4초 뒤에 몰아서 한다.
// 장이 바뀌면 이전 장의 저장 대기분을 먼저 보내고 새 장 메모로 갈아 끼운다.

import { useEffect, useRef, useState } from 'react';
import type { Messages } from '@pointer/i18n';

interface Props {
  deckId: string;
  index: number;
  /** main 이 보낸 현재 장 메모 */
  initial: string;
  t: Messages;
}

export function Notes({ deckId, index, initial, t }: Props) {
  const [text, setText] = useState(initial);
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; flush: () => void } | null>(null);

  useEffect(() => {
    setText(initial);
    return () => {
      // 장이 바뀌기 직전: 아직 안 보낸 메모를 바로 저장
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current.flush();
        pending.current = null;
      }
    };
    // 장이 바뀔 때 정리만 한다. 바깥에서 바뀐 메모는 아래 effect 가 받는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, index]);

  // AI(MCP)나 다른 곳에서 이 장의 메모를 바꾸면 화면에도 반영한다.
  // 단, 사용자가 입력 중이면(저장 대기 중) 덮지 않는다.
  useEffect(() => {
    if (!pending.current) setText(initial);
  }, [initial]);

  const onChange = (v: string) => {
    setText(v);
    if (pending.current) clearTimeout(pending.current.timer);
    const flush = () => window.pointer.setNotes(deckId, index, v);
    pending.current = { timer: setTimeout(() => {
      flush();
      pending.current = null;
    }, 400), flush };
  };

  return (
    <textarea
      className="notes"
      value={text}
      placeholder={t.presenter.notesPlaceholder}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  );
}
