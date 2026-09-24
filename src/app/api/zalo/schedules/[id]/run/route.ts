import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { campaignRunner } from "@/server/zalo/campaign-runner";
import { getSchedule, markRan } from "@/server/zalo/schedules";
import { getCampaign } from "@/server/zalo/campaigns";
import { SESSION_COOKIE, anyZaloAllowed, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Fire a schedule's request right now, without moving its next planned run. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  const s = await getSchedule(Number((await params).id));
  if (!s) return fail("Không tìm thấy lịch trình", 404);
  if (user.role !== "admin") {
    const c = await getCampaign(s.campaignId);
    if (!anyZaloAllowed(user, c?.accountIds ?? [])) {
      return fail("Không tìm thấy lịch trình", 404);
    }
  }
  if (s.campaignName === "(đã xoá)")
    return fail("Yêu cầu của lịch trình đã bị xoá");
  campaignRunner.start(s.campaignId, {
    skipFailed: s.skipFailed,
    skipSucceeded: s.skipSucceeded,
  });
  await markRan(s.id, s.nextRun); // records "last run", keeps the planned next run
  return ok({ started: s.campaignId });
}
