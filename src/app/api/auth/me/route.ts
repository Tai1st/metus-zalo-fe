import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, backendUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Người dùng đang đăng nhập (để hiện tên trên thanh trên cùng). */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token)
    return NextResponse.json(
      { ok: false, error: "Chưa đăng nhập" },
      { status: 401 },
    );

  try {
    const res = await fetch(`${backendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok)
      return NextResponse.json(
        { ok: false, error: "Chưa đăng nhập" },
        { status: 401 },
      );
    const u = (await res.json()) as {
      id: string;
      username: string;
      fullName: string;
      role: string;
      staffLimit?: number;
    };
    return NextResponse.json({
      ok: true,
      data: {
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        staffLimit: u.staffLimit ?? 0,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Không kết nối được máy chủ" },
      { status: 502 },
    );
  }
}
