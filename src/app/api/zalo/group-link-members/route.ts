import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { getSessionFor } from "@/server/zalo/accounts";
import { SESSION_COOKIE, canAccessZalo, getSessionUser } from "@/lib/auth";
import type { GroupMember } from "@/server/zalo/group-roster";

export const dynamic = "force-dynamic";

export type GroupLinkMembersResult = {
  name: string;
  total: number;
  members: GroupMember[];
  /** The group hides its member list from non-members. */
  locked: boolean;
  /** This call made the account join the group. */
  joined: boolean;
  /** Why joining did not work (e.g. the group needs admin approval). */
  joinError?: string;
};

/**
 * Members of a group identified by its invite link. The Zalo calls run in the
 * metus-zalo-be service (ZALO_BE_URL); this route only authenticates the
 * browser, attaches the account's session and relays the result, so the
 * browser never sees how the roster is fetched.
 */
export async function GET(req: NextRequest) {
  const zaloId = req.nextUrl.searchParams.get("account")?.trim();
  const link = req.nextUrl.searchParams.get("link")?.trim();
  if (!zaloId) return fail("Thiếu tham số account");
  if (!link) return fail("Thiếu link nhóm");
  const join = req.nextUrl.searchParams.get("join") === "1";

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
    res = await fetch(`${base.replace(/\/$/, "")}/api/internal/group-link-members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": key },
      body: JSON.stringify({ session, link, join }),
      cache: "no-store",
    });
  } catch {
    return fail("Không kết nối được dịch vụ BE (metus-zalo-be đã chạy chưa?)", 502);
  }

  const body = (await res.json().catch(() => null)) as
    | (GroupLinkMembersResult & { message?: string | string[] })
    | null;
  if (!res.ok || !body) {
    const msg = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return fail(msg || `BE lỗi (${res.status})`, res.status >= 500 ? 502 : res.status);
  }
  return ok(body);
}
