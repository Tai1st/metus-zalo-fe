import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { getApiFor } from "@/server/zalo/accounts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const account = req.nextUrl.searchParams.get("account")?.trim();
  if (!account) return fail("Thiếu account");

  let body: { userId?: string; groupIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const userId = body.userId?.trim();
  const groupIds = (body.groupIds ?? []).map((g) => String(g).trim()).filter(Boolean);
  if (!userId) return fail("Thiếu userId");
  if (groupIds.length === 0) return fail("Chưa chọn nhóm");

  try {
    const api = await getApiFor(account);
    const res = await api.inviteUserToGroups(userId, groupIds);
    return ok(res);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 500);
  }
}
