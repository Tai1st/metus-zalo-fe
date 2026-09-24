import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import { createSchedule, listSchedules } from "@/server/zalo/schedules";
import { getCampaign } from "@/server/zalo/campaigns";
import { ensureScheduler } from "@/server/zalo/scheduler";
import { SESSION_COOKIE, anyZaloAllowed, getSessionUser } from "@/lib/auth";
import type { ScheduleRepeat } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const REPEATS: ScheduleRepeat[] = ["once", "daily", "hourly"];

export async function GET(req: NextRequest) {
  ensureScheduler();
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  const all = await listSchedules();
  if (user.role === "admin") return ok(all);
  // A schedule's own row doesn't carry accountIds — check its campaign.
  const checked = await Promise.all(
    all.map(async (s) => {
      const c = await getCampaign(s.campaignId);
      return anyZaloAllowed(user, c?.accountIds ?? []) ? s : null;
    }),
  );
  return ok(checked.filter((s) => s !== null));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }

  const name = String(body.name ?? "").trim();
  const campaignId = Number(body.campaignId);
  const repeat = REPEATS.includes(body.repeat as ScheduleRepeat)
    ? (body.repeat as ScheduleRepeat)
    : "daily";
  const timeOfDay = /^\d{2}:\d{2}$/.test(String(body.timeOfDay ?? ""))
    ? String(body.timeOfDay)
    : "08:00";
  const timeOfDayEnd = /^\d{2}:\d{2}$/.test(String(body.timeOfDayEnd ?? ""))
    ? String(body.timeOfDayEnd)
    : null;
  const intervalDays = Math.max(1, Number(body.intervalDays) || 1);
  const intervalHours = Math.max(1, Number(body.intervalHours) || 1);
  const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.fromDate ?? ""))
    ? String(body.fromDate)
    : new Date().toISOString().slice(0, 10);
  const toDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.toDate ?? ""))
    ? String(body.toDate)
    : null;

  if (!name) return fail("Thiếu tên lịch trình");
  if (!Number.isInteger(campaignId)) return fail("Chưa chọn yêu cầu");
  const campaign = await getCampaign(campaignId);
  if (!campaign || !anyZaloAllowed(user, campaign.accountIds)) {
    return fail("Không tìm thấy yêu cầu", 404);
  }

  try {
    return ok(
      await createSchedule({
        name,
        campaignId,
        repeat,
        timeOfDay,
        timeOfDayEnd,
        intervalDays,
        intervalHours,
        fromDate,
        toDate,
        enabled: body.enabled === undefined ? true : Boolean(body.enabled),
        skipFailed: Boolean(body.skipFailed),
        skipSucceeded: Boolean(body.skipSucceeded),
      }),
      { status: 201 },
    );
  } catch (e) {
    return fail((e as Error).message);
  }
}
