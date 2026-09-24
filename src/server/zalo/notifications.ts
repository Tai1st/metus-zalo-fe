import "server-only";
import { be } from "./be-client";
import { listAccounts } from "./accounts";
import { effectiveSystemLabel, type LiveMessage } from "@/lib/types";

export type NotificationItem = {
  id: string;
  zaloId: string;
  threadId: string;
  threadType: number;
  fromName: string;
  /** Group display name — only known once /chat has listed that account's groups. */
  groupName?: string;
  preview: string;
  ts: number;
  read: boolean;
};

const PER_ACCOUNT_SCAN = 30;

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await be(
    `/notification-state/read?userId=${encodeURIComponent(userId)}`,
    { method: "PATCH" },
    "/chat",
  );
}

/** Learned whenever /api/zalo/threads lists an account's threads. */
export async function cacheThreadNames(
  zaloId: string,
  threads: { id: string; name: string; avatar: string }[],
): Promise<void> {
  if (threads.length === 0) return;
  try {
    await be(
      "/thread-names",
      { method: "POST", body: { zaloId, threads } },
      "/chat",
    );
  } catch {
    /* best-effort cache */
  }
}

function previewOf(m: LiveMessage): string {
  const label = effectiveSystemLabel(m);
  if (label) return label;
  if (m.stickerId) return "Sticker";
  if (m.attachment) return m.attachment.isImage ? "Hình ảnh" : m.attachment.title || "Tệp đính kèm";
  return m.content || "[đính kèm]";
}

/**
 * Latest incoming (not self-sent) messages across every linked account —
 * or, when `allowedZaloIds` is given (non-admin caller), only those.
 */
export async function recentNotifications(
  userId: string,
  limit = 20,
  allowedZaloIds?: string[],
): Promise<{
  items: NotificationItem[];
  unreadCount: number;
}> {
  const { lastReadAt } = await be<{ lastReadAt: number }>(
    `/notification-state?userId=${encodeURIComponent(userId)}`,
    undefined,
    "/chat",
  );
  let accounts = await listAccounts();
  if (allowedZaloIds) {
    const allowed = new Set(allowedZaloIds);
    accounts = accounts.filter((a) => allowed.has(a.zaloId));
  }

  const rows: { zaloId: string; m: LiveMessage }[] = [];
  let unreadCount = 0;

  await Promise.all(
    accounts.map(async (acc) => {
      const [{ count }, recent] = await Promise.all([
        be<{ count: number }>(
          `/messages/unread-count?zaloId=${encodeURIComponent(acc.zaloId)}&since=${lastReadAt}`,
          undefined,
          "/chat",
        ),
        be<LiveMessage[]>(
          `/messages/recent?zaloId=${encodeURIComponent(acc.zaloId)}&limit=${PER_ACCOUNT_SCAN}`,
          undefined,
          "/chat",
        ),
      ]);
      unreadCount += count;
      for (const m of recent) {
        if (!m.isSelf) rows.push({ zaloId: acc.zaloId, m });
      }
    }),
  );

  rows.sort((a, b) => b.m.ts - a.m.ts);
  const top = rows.slice(0, limit);
  const items: NotificationItem[] = await Promise.all(
    top.map(async ({ zaloId, m }) => {
      let groupName: string | undefined;
      if (m.threadType === 1) {
        const r = await be<{ name: string | null }>(
          `/thread-names/one?zaloId=${encodeURIComponent(zaloId)}&threadId=${encodeURIComponent(m.threadId)}`,
          undefined,
          "/chat",
        );
        groupName = r.name ?? undefined;
      }
      return {
        id: `${zaloId}:${m.threadId}:${m.id}`,
        zaloId,
        threadId: m.threadId,
        threadType: m.threadType,
        fromName: m.fromName || "Ai đó",
        groupName,
        preview: previewOf(m),
        ts: m.ts,
        read: m.ts <= lastReadAt,
      };
    }),
  );

  return { items, unreadCount };
}
