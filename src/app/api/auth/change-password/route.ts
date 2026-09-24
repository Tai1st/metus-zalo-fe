import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, backendUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return fail("Chưa đăng nhập", 401);

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ", 400);
  }
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";
  if (!currentPassword || !newPassword)
    return fail("Nhập đủ mật khẩu hiện tại và mật khẩu mới", 400);

  let res: Response;
  try {
    res = await fetch(`${backendUrl()}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
      cache: "no-store",
    });
  } catch {
    return fail("Không kết nối được máy chủ, vui lòng thử lại sau", 502);
  }

  if (!res.ok) {
    if (res.status === 429)
      return fail("Thử quá nhiều lần, vui lòng đợi 1 phút rồi thử lại", 429);
    const data = (await res.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    return fail(
      msg || "Đổi mật khẩu không thành công",
      res.status >= 500 ? 502 : res.status,
    );
  }

  return NextResponse.json({ ok: true, data: { ok: true } });
}
