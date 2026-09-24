import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { listFriendRequests } from "@/server/zalo/friend-requests";
import { SESSION_COOKIE, canAccessZalo, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Danh sách lời mời kết bạn đã nhận — lọc theo `?account=`, hoặc toàn bộ
 * (chỉ admin) khi không truyền. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);

  const zaloId = req.nextUrl.searchParams.get("account")?.trim();
  if (zaloId) {
    if (!canAccessZalo(user, zaloId)) {
      return fail("Bạn không có quyền dùng tài khoản Zalo này", 403);
    }
    return ok(await listFriendRequests(zaloId));
  }
  if (user.role !== "admin") return fail("Thiếu tham số account", 400);
  return ok(await listFriendRequests());
}
