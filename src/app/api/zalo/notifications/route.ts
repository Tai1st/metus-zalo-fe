import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { recentNotifications } from "@/server/zalo/notifications";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
  try {
    return ok(
      await recentNotifications(
        user.id,
        limit,
        user.role === "admin" ? undefined : user.allowedZaloIds,
      ),
    );
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 500);
  }
}
