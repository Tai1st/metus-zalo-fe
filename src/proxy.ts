import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";

// Công khai: landing, trang đăng nhập, API đăng nhập/đăng xuất và form dùng thử.
const PUBLIC = ["/", "/login", "/api/auth/login", "/api/auth/logout", "/api/leads"];

/**
 * Nhân sự (role "staff") dùng chung giao diện với leader (khách chủ tài khoản) — chỉ khác ở
 * chỗ: không vào được "Quản lý truy cập" (mục này quản lý chính họ), và mọi
 * nơi liệt kê/tác động tài khoản Zalo tự lọc theo `allowedZaloIds` (xem
 * withAccount() trong server/zalo/http.ts + các route dùng zaloId trực tiếp).
 */
const OWNER_ONLY_PREFIXES = ["/accounts/access", "/api/employees"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (
    (user.role === "staff" || !(user.staffLimit && user.staffLimit > 0)) &&
    OWNER_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Bạn không có quyền dùng tính năng này" },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/accounts", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)"],
};
