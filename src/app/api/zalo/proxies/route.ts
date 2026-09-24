import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import { checkIpv4Proxy } from "@/server/zalo/proxyAgent";
import {
  createProxy,
  proxiesVisibleTo,
  parseProxyBody,
} from "@/server/zalo/proxies";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  return ok(await proxiesVisibleTo(user));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const parsed = parseProxyBody(body);
  if (typeof parsed === "string") return fail(parsed);
  const check = await checkIpv4Proxy(parsed);
  if (!check.ok) return fail(check.error);
  return ok(await createProxy(parsed, user.ownerId || user.id), { status: 201 });
}
