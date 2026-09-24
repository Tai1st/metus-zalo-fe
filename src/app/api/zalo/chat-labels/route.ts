import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { createChatLabel, listChatLabels } from "@/server/zalo/chat-labels";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok(await listChatLabels());
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
    : "#f04438";
  return ok(await createChatLabel(name, color), { status: 201 });
}
