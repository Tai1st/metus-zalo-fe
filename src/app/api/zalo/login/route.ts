import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { loginController } from "@/server/zalo/login-controller";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Start a QR login session. Returns a tempId to poll. */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  const tempId = loginController.start(
    user && user.role !== "admin" ? user.id : undefined,
    token,
  );
  return ok({ tempId });
}

/** Poll a QR login session: /api/zalo/login?tempId=... */
export async function GET(req: NextRequest) {
  const tempId = req.nextUrl.searchParams.get("tempId")?.trim();
  if (!tempId) return fail("Thiếu tempId");
  const session = loginController.get(tempId);
  if (!session) return fail("Phiên đăng nhập không tồn tại hoặc đã hết hạn", 404);
  return ok(session);
}

/** Abort a pending QR login session. */
export async function DELETE(req: NextRequest) {
  const tempId = req.nextUrl.searchParams.get("tempId")?.trim();
  if (!tempId) return fail("Thiếu tempId");
  loginController.cancel(tempId);
  return ok({ cancelled: tempId });
}
