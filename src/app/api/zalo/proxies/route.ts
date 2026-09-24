import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import {
  createProxy,
  listProxies,
  parseProxyBody,
} from "@/server/zalo/proxies";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listProxies());
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const parsed = parseProxyBody(body);
  if (typeof parsed === "string") return fail(parsed);
  return ok(await createProxy(parsed), { status: 201 });
}
