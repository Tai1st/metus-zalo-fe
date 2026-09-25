import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { getSessionFor } from "@/server/zalo/accounts";
import { SESSION_COOKIE, canAccessZalo, getSessionUser } from "@/lib/auth";
import type { ZaloGroup } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Groups the account currently belongs to (for the "destination group"
 * picker). The Zalo calls run in the metus-zalo-be service (ZALO_BE_URL);
 * this route only authenticates the browser, attaches the account's session
 * and relays the result, so the browser never sees how the list is fetched.
 */
export async function GET(req: NextRequest) {
  const zaloId = req.nextUrl.searchParams.get("account")?.trim();
  if (!zaloId) return fail("Thiếu tham số account");

  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  if (!canAccessZalo(user, zaloId)) {
    return fail("Không tìm thấy tài khoản", 404);
  }

  const base = process.env.ZALO_BE_URL;
  const key = process.env.ZALO_BE_KEY;
  if (!base || !key) return fail("Chưa cấu hình ZALO_BE_URL / ZALO_BE_KEY", 500);

  let session;
  try {
    session = await getSessionFor(zaloId);
  } catch (err) {
    if (err instanceof Error && err.message === "ACCOUNT_NOT_FOUND") {
      return fail("Không tìm thấy tài khoản", 404);
    }
    return fail(err instanceof Error ? err.message : String(err), 500);
  }

  let res: Response;
  try {
    res = await fetch(`${base.replace(/\/$/, "")}/api/internal/groups-mine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": key },
      body: JSON.stringify({ session }),
      cache: "no-store",
    });
  } catch {
    return fail("Không kết nối được dịch vụ BE (metus-zalo-be đã chạy chưa?)", 502);
  }

  const body = (await res.json().catch(() => null)) as
    | (ZaloGroup[] & { message?: string | string[] })
    | { message?: string | string[] }
    | null;
  if (!res.ok || !body) {
    const msg = Array.isArray(
      (body as { message?: string | string[] } | null)?.message,
    )
      ? ((body as { message?: string[] }).message as string[]).join(", ")
      : (body as { message?: string } | null)?.message;
    return fail(msg || `BE lỗi (${res.status})`, res.status >= 500 ? 502 : res.status);
  }
  return ok(body as ZaloGroup[]);
}
