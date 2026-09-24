import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { getThreadLabelIds, setThreadLabels } from "@/server/zalo/chat-labels";

export const dynamic = "force-dynamic";

function keys(req: NextRequest) {
  const account = req.nextUrl.searchParams.get("account")?.trim();
  const threadId = req.nextUrl.searchParams.get("threadId")?.trim();
  return { account, threadId };
}

export async function GET(req: NextRequest) {
  const { account, threadId } = keys(req);
  if (!account || !threadId) return fail("Thiếu account hoặc threadId");
  return ok(await getThreadLabelIds(account, threadId));
}

export async function PUT(req: NextRequest) {
  const { account, threadId } = keys(req);
  if (!account || !threadId) return fail("Thiếu account hoặc threadId");

  let body: { labelIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const ids = Array.isArray(body.labelIds)
    ? body.labelIds.map(Number).filter((n) => Number.isInteger(n))
    : [];
  await setThreadLabels(account, threadId, ids);
  return ok({ labelIds: ids });
}
