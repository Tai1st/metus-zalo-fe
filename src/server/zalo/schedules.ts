import "server-only";
import { be } from "./be-client";
import type { Schedule, ScheduleRepeat } from "@/lib/schedule";

/** A schedule that is on but has no future run would silently never fire. */
function assertCanFire(
  s: Pick<
    ScheduleInput,
    | "repeat"
    | "timeOfDay"
    | "timeOfDayEnd"
    | "intervalDays"
    | "intervalHours"
    | "fromDate"
    | "toDate"
    | "enabled"
  >,
): void {
  if (s.enabled && computeNextRun(s, Date.now()) === null) {
    throw new Error(
      "Thời điểm chạy đã qua — chọn giờ / ngày bắt đầu trong tương lai (hoặc bỏ ngày kết thúc)",
    );
  }
}

export async function listSchedules(): Promise<Schedule[]> {
  return be<Schedule[]>("", undefined, "/schedules");
}

export async function getSchedule(id: number): Promise<Schedule | undefined> {
  const r = await be<Schedule | null>(`/${id}`, undefined, "/schedules");
  return r ?? undefined;
}

export type ScheduleInput = {
  name: string;
  campaignId: number;
  repeat: ScheduleRepeat;
  timeOfDay: string;
  timeOfDayEnd: string | null;
  intervalDays: number;
  intervalHours: number;
  fromDate: string;
  toDate: string | null;
  enabled: boolean;
  skipFailed: boolean;
  skipSucceeded: boolean;
};

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  assertCanFire(input);
  return be<Schedule>(
    "",
    {
      method: "POST",
      body: { ...input, nextRun: computeNextRun(input, Date.now()) },
    },
    "/schedules",
  );
}

export async function updateSchedule(
  id: number,
  fields: Partial<ScheduleInput>,
): Promise<Schedule | undefined> {
  const cur = await getSchedule(id);
  if (!cur) return undefined;
  const merged: ScheduleInput = {
    name: fields.name ?? cur.name,
    campaignId: fields.campaignId ?? cur.campaignId,
    repeat: fields.repeat ?? cur.repeat,
    timeOfDay: fields.timeOfDay ?? cur.timeOfDay,
    timeOfDayEnd:
      fields.timeOfDayEnd === undefined ? cur.timeOfDayEnd : fields.timeOfDayEnd,
    intervalDays: fields.intervalDays ?? cur.intervalDays,
    intervalHours: fields.intervalHours ?? cur.intervalHours,
    fromDate: fields.fromDate ?? cur.fromDate,
    toDate: fields.toDate === undefined ? cur.toDate : fields.toDate,
    enabled: fields.enabled ?? cur.enabled,
    skipFailed: fields.skipFailed ?? cur.skipFailed,
    skipSucceeded: fields.skipSucceeded ?? cur.skipSucceeded,
  };
  assertCanFire(merged);
  return be<Schedule>(
    `/${id}`,
    {
      method: "PATCH",
      body: {
        ...merged,
        nextRun: merged.enabled ? computeNextRun(merged, Date.now()) : null,
      },
    },
    "/schedules",
  );
}

export async function deleteSchedule(id: number): Promise<void> {
  await be(`/${id}`, { method: "DELETE" }, "/schedules");
}

export async function markRan(id: number, nextRunIso: string | null): Promise<void> {
  await be(`/${id}/ran`, { method: "PATCH", body: { nextRun: nextRunIso } }, "/schedules");
}

/** Enabled schedules whose next_run is due. */
export async function dueSchedules(nowMs: number): Promise<Schedule[]> {
  const all = await listSchedules();
  return all.filter(
    (s) =>
      s.enabled &&
      s.nextRun !== null &&
      Date.parse(s.nextRun) <= nowMs &&
      (!s.toDate || Date.parse(`${s.toDate}T23:59:59`) >= nowMs),
  );
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function dayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Chọn ngẫu nhiên 1 phút trong [timeOfDay, timeOfDayEnd] — không có
 * timeOfDayEnd (hoặc end <= start) thì trả về giờ cố định timeOfDay. */
function pickWindowMinutes(timeOfDay: string, timeOfDayEnd: string | null): number {
  const startMin = minutesOf(timeOfDay);
  if (!timeOfDayEnd) return startMin;
  const endMin = minutesOf(timeOfDayEnd);
  if (endMin <= startMin) return startMin;
  return startMin + Math.floor(Math.random() * (endMin - startMin + 1));
}

const MAX_DAYS_SCAN = 3660; // ~10 năm — chặn vòng lặp vô hạn khi tính lịch "Theo giờ"

/**
 * Next fire time (ISO) strictly after `afterMs`, or null when the schedule has
 * no more occurrences (past a one-off, or past `toDate`). Gọi lại hàm này cho
 * mỗi lượt kế tiếp — "once"/"daily" random 1 giờ mới trong khung mỗi lần gọi.
 */
export function computeNextRun(
  s: Pick<
    ScheduleInput,
    | "repeat"
    | "timeOfDay"
    | "timeOfDayEnd"
    | "intervalDays"
    | "intervalHours"
    | "fromDate"
    | "toDate"
  >,
  afterMs: number,
): string | null {
  const fromStart = Date.parse(`${s.fromDate}T00:00:00`);
  const limit = s.toDate ? Date.parse(`${s.toDate}T23:59:59`) : Infinity;

  if (s.repeat === "hourly") {
    const stepMs = Math.max(1, s.intervalHours) * 3600e3;
    const winStart = minutesOf(s.timeOfDay);
    const winEnd = s.timeOfDayEnd ? minutesOf(s.timeOfDayEnd) : 23 * 60 + 59;
    let day = dayStart(Math.max(afterMs, fromStart));
    for (let i = 0; i < MAX_DAYS_SCAN; i++) {
      if (day > limit) return null;
      const dayEnd = day + Math.max(winStart, winEnd) * 60_000;
      for (let slot = day + winStart * 60_000; slot <= dayEnd; slot += stepMs) {
        if (slot > afterMs && slot >= fromStart) {
          if (slot > limit) return null;
          return new Date(slot).toISOString();
        }
      }
      day += 86_400_000;
    }
    return null;
  }

  // "once" | "daily"
  const at = (dayMs: number) => {
    const min = pickWindowMinutes(s.timeOfDay, s.timeOfDayEnd);
    return dayMs + min * 60_000;
  };

  let next = at(dayStart(fromStart));
  if (s.repeat === "daily") {
    const stepMs = Math.max(1, s.intervalDays) * 86_400_000;
    while (next <= afterMs) next = at(dayStart(next) + stepMs);
  }

  if (next <= afterMs || next > limit) return null;
  return new Date(next).toISOString();
}
