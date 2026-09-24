import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, BeAsUserError, beAsUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function fail(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return fail("Chưa đăng nhập", 401);
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ", 400);
  }
  try {
    const data = await beAsUser(token, `/users/${id}/password`, {
      method: "PATCH",
      body,
    });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const status = e instanceof BeAsUserError ? e.status : 502;
    return fail((e as Error).message, status);
  }
}
