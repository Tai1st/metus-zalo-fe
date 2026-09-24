import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { listAccounts, restoreAll } from "@/server/zalo/accounts";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

let restoredOnce = false;

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);

  // First load also reconnects stored sessions and backfills missing
  // display name / phone number from Zalo.
  if (!restoredOnce) {
    restoredOnce = true;
    try {
      await restoreAll();
    } catch {
      restoredOnce = false;
    }
  }
  const accounts = await listAccounts();
  if (user.role === "admin") return ok(accounts);
  const allowed = new Set(user.allowedZaloIds);
  return ok(accounts.filter((a) => allowed.has(a.zaloId)));
}
