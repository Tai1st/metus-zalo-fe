"use client";

import { useEffect, useRef } from "react";

/** Calls `onMessage(threadId)` the instant the server receives a message. */
export function useMessageStream(
  account: string | null,
  onMessage: (threadId: string) => void,
) {
  const cb = useRef(onMessage);
  useEffect(() => {
    cb.current = onMessage;
  });

  useEffect(() => {
    if (!account) return;
    const es = new EventSource(`/api/zalo/stream?account=${account}`);
    es.onmessage = (e) => {
      try {
        cb.current((JSON.parse(e.data) as { threadId: string }).threadId);
      } catch {
        /* ignore malformed frame */
      }
    };
    return () => es.close();
  }, [account]);
}
