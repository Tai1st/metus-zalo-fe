import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, backendUrl, tokenExpiry } from "@/lib/auth";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ", 400);
  }
  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";
  if (!username || !password)
    return fail("Nhập tên đăng nhập và mật khẩu", 400);

  let res: Response;
  try {
    res = await fetch(`${backendUrl()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Để backend giới hạn tốc độ theo từng người truy cập thay vì cả website.
        ...(clientIp(req) ? { "X-Forwarded-For": clientIp(req) } : {}),
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch {
    return fail("Không kết nối được máy chủ, vui lòng thử lại sau", 502);
  }

  const data = (await res.json().catch(() => null)) as {
    accessToken?: string;
    user?: { id: string; username: string; fullName: string; role: string };
    message?: string | string[];
  } | null;

  if (!res.ok || !data?.accessToken || !data.user) {
    if (res.status === 429)
      return fail("Thử quá nhiều lần, vui lòng đợi 1 phút rồi thử lại", 429);
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    return fail(
      msg || "Đăng nhập không thành công",
      res.status >= 500 ? 502 : res.status,
    );
  }

  // Tài khoản quản trị chỉ đăng nhập ở trang admin riêng, không dùng ở đây.
  if (data.user.role === "admin") {
    return fail("Tên đăng nhập hoặc mật khẩu không đúng", 401);
  }

  const exp = tokenExpiry(data.accessToken);
  const maxAge = exp
    ? Math.max(60, exp - Math.floor(Date.now() / 1000))
    : 60 * 60 * 24;
  const out = NextResponse.json({
    ok: true,
    data: {
      id: data.user.id,
      username: data.user.username,
      fullName: data.user.fullName,
      role: data.user.role,
    },
  });
  out.cookies.set(SESSION_COOKIE, data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return out;
}
