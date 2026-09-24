import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { ThreadType } from "zca-js";
import { fail, ok, withAccount } from "@/server/zalo/http";
import { connectionManager } from "@/server/zalo/connection-manager";
import { getApiFor } from "@/server/zalo/accounts";

export const dynamic = "force-dynamic";

/** Live incoming-message buffer for an account. */
export function GET(req: NextRequest) {
  const since = Number(req.nextUrl.searchParams.get("since") ?? 0);
  return withAccount(req, async (_api, zaloId) => {
    return connectionManager.messages(zaloId, since);
  });
}

/** Send a message (optionally with one attachment) from an account. */
export async function POST(req: NextRequest) {
  const zaloId = req.nextUrl.searchParams.get("account")?.trim();
  if (!zaloId) return fail("Thiếu tham số account");

  let body: {
    threadId?: string;
    message?: string;
    type?: number;
    attachmentPath?: string;
  };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const threadId = body.threadId?.trim();
  const message = body.message?.trim() ?? "";
  const attachmentPath = body.attachmentPath?.trim();
  if (!threadId) return fail("Thiếu threadId");
  if (!message && !attachmentPath) return fail("Thiếu nội dung tin nhắn");

  const type =
    body.type === ThreadType.Group ? ThreadType.Group : ThreadType.User;

  try {
    const api = await getApiFor(zaloId);
    if (attachmentPath) {
      const abs = path.join(process.cwd(), "data", attachmentPath);
      if (!fs.existsSync(abs)) return fail("File đính kèm không tồn tại");
      return ok(
        await api.sendMessage({ msg: message, attachments: abs }, threadId, type),
      );
    }
    return ok(await api.sendMessage(message, threadId, type));
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 500);
  }
}
