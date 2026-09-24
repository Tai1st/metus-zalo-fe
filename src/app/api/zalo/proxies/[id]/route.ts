import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import {
  deleteProxy,
  parseProxyBody,
  updateProxy,
} from "@/server/zalo/proxies";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteProxy(Number(id));
  return ok({ removed: Number(id) });
}
