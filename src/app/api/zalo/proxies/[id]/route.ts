import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import {
  deleteProxy,
  listProxies,
  parseProxyBody,
  updateProxy,
} from "@/server/zalo/proxies";

export const dynamic = "force-dynamic";

/** Only the creator may edit / delete a proxy. */
async function canManage(req: Request, id: number) {
  const cookie = (req as NextRequest).cookies?.get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(cookie);
  if (!user) return { error: fail("Chưa đăng nhập", 401) };
  const p = (await listProxies()).find((x) => x.id === id);
  if (!p || p.ownerId !== (user.ownerId || user.id)) {
    return { error: fail("Không tìm thấy proxy", 404) };
  }
  return {};
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await canManage(req, Number(id));
  if (guard.error) return guard.error;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const parsed = parseProxyBody(body);
  if (typeof parsed === "string") return fail(parsed);
  const updated = await updateProxy(Number(id), parsed);
  if (!updated) return fail("Không tìm thấy proxy", 404);
  return ok(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await canManage(req, Number(id));
  if (guard.error) return guard.error;
  await deleteProxy(Number(id));
  return ok({ removed: Number(id) });
}
