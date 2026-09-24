import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { markAllNotificationsRead } from "@/server/zalo/notifications";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  await markAllNotificationsRead(user.id);
  return ok({ read: true });
}
