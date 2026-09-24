import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { deleteChatLabel, updateChatLabel } from "@/server/zalo/chat-labels";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { name?: string; color?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const fields: { name?: string; color?: string } = {};
  if (body.name?.trim()) fields.name = body.name.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(body.color ?? "")) fields.color = body.color;
  await updateChatLabel(Number(id), fields);
  return ok({ updated: Number(id) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteChatLabel(Number(id));
  return ok({ removed: Number(id) });
}
