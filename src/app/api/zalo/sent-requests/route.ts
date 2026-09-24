import type { NextRequest } from "next/server";
import { withAccount } from "@/server/zalo/http";

export const dynamic = "force-dynamic";

export type SentRequest = { id: string; name: string; avatar: string };

/** Friend requests this account has sent that are still pending. */
export function GET(req: NextRequest) {
  return withAccount(req, async (api): Promise<SentRequest[]> => {
    const res = await api.getSentFriendRequest();
    return Object.values(res ?? {}).map((r) => ({
      id: String(r.userId),
      name: r.displayName || r.zaloName || String(r.userId),
      avatar: r.avatar ?? "",
    }));
  });
}
