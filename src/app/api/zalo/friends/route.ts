import type { NextRequest } from "next/server";
import { withAccount } from "@/server/zalo/http";
import { getFriends } from "@/server/zalo/friends";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  return withAccount(req, (api, zaloId) => getFriends(api, zaloId, { fresh }));
}
