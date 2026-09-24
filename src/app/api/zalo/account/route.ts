import type { NextRequest } from "next/server";
import { withAccount } from "@/server/zalo/http";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return withAccount(req, async (api, zaloId) => {
    const info = await api.fetchAccountInfo();
    return { profile: info.profile, zaloId };
  });
}
