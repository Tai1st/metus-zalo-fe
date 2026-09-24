import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { setAccountProxy } from "@/server/zalo/accounts";
import { requireZaloAccess } from "@/lib/auth";
import { proxiesVisibleTo } from "@/server/zalo/proxies";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ zaloId: string }> },
) {
  const { zaloId } = await params;
  const access = await requireZaloAccess(req, zaloId);
  if (access.response) return access.response;
  let body: { proxyId?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const proxyId =
    body.proxyId === null || body.proxyId === undefined
      ? null
      : Number(body.proxyId);
  if (proxyId !== null && !Number.isInteger(proxyId)) {
    return fail("proxyId không hợp lệ");
  }
  if (proxyId !== null) {
    const visible = await proxiesVisibleTo(access.user);
    if (!visible.some((p) => p.id === proxyId)) {
      return fail("Không tìm thấy proxy", 404);
    }
  }
  await setAccountProxy(zaloId, proxyId);
  return ok({ zaloId, proxyId });
}
