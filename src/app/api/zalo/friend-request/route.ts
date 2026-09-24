import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { getApiFor } from "@/server/zalo/accounts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const account = req.nextUrl.searchParams.get("account")?.trim();
  if (!account) return fail("Thiếu account");

  let body: { userId?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }
  const userId = body.userId?.trim();
  if (!userId) return fail("Thiếu userId");

  try {
    const api = await getApiFor(account);
    await api.sendFriendRequest(
      body.message?.trim() || "Xin chào, kết bạn nhé!",
      userId,
    );
    return ok({ sent: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 500);
  }
}
