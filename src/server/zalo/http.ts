import { type NextRequest, NextResponse } from "next/server";
import type { API } from "zca-js";
import { getApiFor, restoreAll } from "./accounts";
import { ensureScheduler } from "./scheduler";
import { SESSION_COOKIE, canAccessZalo, getSessionUser } from "@/lib/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

let restored = false;
async function ensureRestored() {
  ensureScheduler();
  if (restored) return;
  restored = true;
  try {
    await restoreAll();
  } catch {
    restored = false;
  }
}

/**
 * Resolve the zca-js API for the account named by `?account=<zaloId>` and run
 * `handler`. Restores persisted sessions on the first request.
 */
export function withAccount<T>(
  req: NextRequest,
  handler: (api: API, zaloId: string) => Promise<T>,
) {
  return (async () => {
    const zaloId = req.nextUrl.searchParams.get("account")?.trim();
    if (!zaloId) return fail("Thiếu tham số account", 400);
    const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
    if (!user) return fail("Chưa đăng nhập", 401);
    if (!canAccessZalo(user, zaloId)) {
      return fail("Bạn không có quyền dùng tài khoản Zalo này", 403);
    }
    try {
      await ensureRestored();
      const api = await getApiFor(zaloId);
      return ok(await handler(api, zaloId));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "ACCOUNT_NOT_FOUND") {
        return fail("Không tìm thấy tài khoản", 404);
      }
      return fail(message, 500);
    }
  })();
}
