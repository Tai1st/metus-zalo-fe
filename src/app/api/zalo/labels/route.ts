import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { createLabel, listLabels } from "@/server/zalo/labels";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listLabels());
}

export async function POST(req: NextRequest) {
  let body: { name?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const name = body.name?.trim();
  if (!name) return fail("Thiếu tên nhãn");
  const color = /^#[0-9a-fA-F]{6}$/.test(body.color ?? "")
    ? (body.color as string)
    : "#0068ff";
  return ok(await createLabel(name, color), { status: 201 });
}
