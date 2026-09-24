import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, backendUrl } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Gói đang dùng của người đăng nhập (hiện trên thanh trên cùng). */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token)
    return NextResponse.json(
      { ok: false, error: "Chưa đăng nhập" },
      { status: 401 },
    );
  try {
    const res = await fetch(`${backendUrl()}/subscriptions/me/current`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ ok: true, data: null });
    const { subscription: s } = (await res.json()) as {
      subscription: {
        expiresAt: string | null;
        snapshot: { planName: string };
      } | null;
    };
    return NextResponse.json({
      ok: true,
      data: s
        ? { planName: s.snapshot.planName, expiresAt: s.expiresAt }
        : null,
    });
  } catch {
    return NextResponse.json({ ok: true, data: null });
  }
}
