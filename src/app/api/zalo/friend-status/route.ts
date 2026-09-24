import type { NextRequest } from "next/server";
import { fail, withAccount } from "@/server/zalo/http";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")?.trim();
  if (!userId) return fail("Thiếu userId");
  return withAccount(req, async (api) => {
    const s = await api.getFriendRequestStatus(userId);
    return {
      isFriend: s.is_friend === 1,
      isRequested: s.is_requested === 1,
      isRequesting: s.is_requesting === 1,
    };
  });
}
