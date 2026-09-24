"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/fetcher";

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  /** Epoch ms of the last successful fetch (0 before the first). */
  updatedAt: number;
};

/** Fetch a JSON endpoint once (plus manual reload). Optionally poll on an interval. */
export function useApi<T>(path: string | null, pollMs?: number): State<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const [tick, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const d = await apiGet<T>(path);
        if (!alive) return;
        setData(d);
        setUpdatedAt(Date.now());
        setError(null);
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [path, tick]);

  useEffect(() => {
    if (!path || !pollMs) return;
    const id = setInterval(reload, pollMs);
    return () => clearInterval(id);
  }, [path, pollMs, reload]);

  return { data, error, loading, reload, updatedAt };
}
