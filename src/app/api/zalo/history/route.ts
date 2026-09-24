import type { NextRequest } from "next/server";
import { fail, withAccount } from "@/server/zalo/http";
import { connectionManager } from "@/server/zalo/connection-manager";

export const dynamic = "force-dynamic";

/**
 * Messages for one thread, served from what the socket has delivered and we
 * persisted (Zalo exposes no reliable per-thread history API). Live updates
 * arrive through /api/zalo/stream.
 */
export function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId")?.trim();
  if (!threadId) return fail("Thiếu threadId");

  return withAccount(req, async (_api, zaloId) => {
    return await connectionManager.threadMessages(zaloId, threadId);
  });
}
