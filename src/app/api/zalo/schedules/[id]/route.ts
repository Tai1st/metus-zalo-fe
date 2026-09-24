import type { NextRequest } from "next/server";
import { fail, ok } from "@/server/zalo/http";
import {
  deleteSchedule,
  getSchedule,
  updateSchedule,
  type ScheduleInput,
} from "@/server/zalo/schedules";
import { getCampaign } from "@/server/zalo/campaigns";
import { SESSION_COOKIE, anyZaloAllowed, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function assertScheduleAccess(
  req: NextRequest,
  id: number,
): Promise<Awaited<ReturnType<typeof getSessionUser>> | ReturnType<typeof fail>> {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return fail("Chưa đăng nhập", 401);
  if (user.role === "admin") return user;
  const s = await getSchedule(id);
  if (!s) return fail("Không tìm thấy lịch trình", 404);
  const c = await getCampaign(s.campaignId);
  if (!anyZaloAllowed(user, c?.accountIds ?? [])) {
    return fail("Không tìm thấy lịch trình", 404);
  }
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await assertScheduleAccess(req, Number(id));
  if (guard instanceof Response) return guard;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }

  const fields: Partial<ScheduleInput> = {};
  if (typeof body.name === "string" && body.name.trim())
    fields.name = body.name.trim();
  if (body.enabled !== undefined) fields.enabled = Boolean(body.enabled);
  if (body.skipFailed !== undefined)
    fields.skipFailed = Boolean(body.skipFailed);
  if (body.skipSucceeded !== undefined)
    fields.skipSucceeded = Boolean(body.skipSucceeded);
  if (body.campaignId !== undefined)
    fields.campaignId = Number(body.campaignId);
  if (
    body.repeat === "once" ||
    body.repeat === "daily" ||
    body.repeat === "hourly"
  )
    fields.repeat = body.repeat;
  if (/^\d{2}:\d{2}$/.test(String(body.timeOfDay ?? "")))
    fields.timeOfDay = String(body.timeOfDay);
  if (body.timeOfDayEnd === null) fields.timeOfDayEnd = null;
  else if (/^\d{2}:\d{2}$/.test(String(body.timeOfDayEnd ?? "")))
    fields.timeOfDayEnd = String(body.timeOfDayEnd);
  if (body.intervalDays !== undefined)
    fields.intervalDays = Math.max(1, Number(body.intervalDays) || 1);
  if (body.intervalHours !== undefined)
    fields.intervalHours = Math.max(1, Number(body.intervalHours) || 1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.fromDate ?? "")))
    fields.fromDate = String(body.fromDate);
  if (
    body.toDate === null ||
    /^\d{4}-\d{2}-\d{2}$/.test(String(body.toDate ?? ""))
  )
    fields.toDate = body.toDate === null ? null : String(body.toDate);

  try {
    const updated = await updateSchedule(Number(id), fields);
    if (!updated) return fail("Không tìm thấy lịch trình", 404);
    return ok(updated);
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await assertScheduleAccess(req, Number(id));
  if (guard instanceof Response) return guard;
  await deleteSchedule(Number(id));
  return ok({ removed: Number(id) });
}
