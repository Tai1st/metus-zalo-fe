import "server-only";
import type { API } from "zca-js";
import type { ZaloUser } from "@/lib/types";

const TTL_MS = 60_000;
type Entry = { at: number; data: ZaloUser[]; pending?: Promise<ZaloUser[]> };
const g = globalThis as unknown as { __zaloFriends?: Map<string, Entry> };
const cache = (g.__zaloFriends ??= new Map<string, Entry>());

/** Zalo briefly rate-limits (HTTP 429) getAllFriends when it is called often,
 * so friend lists are cached for a minute and a 429 is retried once. */
async function fetchWithRetry(api: API): Promise<ZaloUser[]> {
  try {
    return (await api.getAllFriends()) as ZaloUser[];
  } catch (err) {
    if (!/429/.test(err instanceof Error ? err.message : String(err)))
      throw err;
    await new Promise((r) => setTimeout(r, 1500));
    return (await api.getAllFriends()) as ZaloUser[];
  }
}

export async function getFriends(
  api: API,
  zaloId: string,
  opts: { fresh?: boolean } = {},
): Promise<ZaloUser[]> {
  const hit = cache.get(zaloId);
  if (hit && !opts.fresh && Date.now() - hit.at < TTL_MS) return hit.data;
  if (hit?.pending) return hit.pending; // share one in-flight request
  const pending = fetchWithRetry(api)
    .then((data) => {
      cache.set(zaloId, { at: Date.now(), data });
      return data;
    })
    .catch((err) => {
      // On a rate limit, stale data beats an error.
      if (hit?.data.length) return hit.data;
      cache.delete(zaloId);
      throw err;
    });
  cache.set(zaloId, { at: hit?.at ?? 0, data: hit?.data ?? [], pending });
  return pending;
}
