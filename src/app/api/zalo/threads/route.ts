import type { NextRequest } from "next/server";
import { withAccount } from "@/server/zalo/http";
import { connectionManager } from "@/server/zalo/connection-manager";
import { threadLabelsForAccount } from "@/server/zalo/chat-labels";
import { getFriends } from "@/server/zalo/friends";
import { cacheThreadNames } from "@/server/zalo/notifications";
import type { ZaloGroup } from "@/lib/types";

export const dynamic = "force-dynamic";

export type ThreadSummary = {
  id: string;
  name: string;
  avatar: string;
  type: "user" | "group";
  labelIds: number[];
  /** Epoch ms of the most recent known message — conversations sort by this. */
  lastMessageAt: number;
  /** One-line preview of the newest stored message, e.g. "Bạn: xin chào". */
  lastMessage: string;
};

export function GET(req: NextRequest) {
  const type =
    req.nextUrl.searchParams.get("type") === "group" ? "group" : "user";

  return withAccount(req, async (api, zaloId) => {
    const labelMap = await threadLabelsForAccount(zaloId);
    // Prefer a real message we've actually seen (live traffic or backfill);
    // it's a more accurate "last activity" signal than the group sync version.
    const lastSeen = await connectionManager.lastMessageTimestamps(zaloId);
    const previews = await connectionManager.lastMessagePreviews(zaloId);

    let threads: ThreadSummary[];

    if (type === "group") {
      const all = await api.getAllGroups();
      const ids = Object.keys(all.gridVerMap ?? {});
      if (ids.length === 0) return [];

      // Zalo's getmg-v2 endpoint rejects overly large batches ("Tham số
      // không hợp lệ") once an account is in ~50+ groups — chunk the lookup.
      const CHUNK = 40;
      const groups: ZaloGroup[] = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const info = await api.getGroupInfo(chunk);
        groups.push(...Object.values(info.gridInfoMap ?? {}));
      }

      threads = groups.map((g) => {
        const id = String(g.groupId);
        // gridVerMap's value is Zalo's own sync-version timestamp for the
        // group — a decent fallback for groups we haven't seen live traffic
        // from yet.
        const syncVer = Number(all.gridVerMap[id]) || 0;
        return {
          id,
          name: g.name ?? "Nhóm",
          avatar: (g.fullAvt as string) ?? (g.avt as string) ?? "",
          type: "group" as const,
          labelIds: labelMap[id] ?? [],
          lastMessageAt: lastSeen[id] ?? syncVer,
          lastMessage: previews[id] ?? "",
        };
      });
    } else {
      const friends = await getFriends(api, zaloId);
      threads = friends.map((u) => {
        const id = String(u.userId ?? u.uid);
        return {
          id,
          name: u.displayName ?? u.zaloName ?? id,
          avatar: u.avatar ?? "",
          type: "user" as const,
          labelIds: labelMap[id] ?? [],
          lastMessageAt: lastSeen[id] ?? 0,
          lastMessage: previews[id] ?? "",
        };
      });
    }

    // Piggyback group names into the local cache — the notification bell
    // needs them (it can't afford a live API call per notification) and this
    // request already paid for them.
    await cacheThreadNames(zaloId, threads);

    // Recent-first; ties (no known activity, e.g. most friends) fall back to
    // name order instead of Zalo's arbitrary list order, which read as
    // "unsorted" to users.
    return threads.sort(
      (a, b) =>
        b.lastMessageAt - a.lastMessageAt || a.name.localeCompare(b.name, "vi"),
    );
  });
}
