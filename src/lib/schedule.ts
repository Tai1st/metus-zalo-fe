/** "interval" (mỗi N ngày, giờ cố định) từ trước gộp vào "daily" — mỗi lần
 * tới lượt chạy sẽ chọn ngẫu nhiên 1 giờ trong [timeOfDay, timeOfDayEnd]. */
export type ScheduleRepeat = "once" | "daily" | "hourly";

export type Schedule = {
  id: number;
  name: string;
  campaignId: number;
  campaignName: string;
  campaignKind: string;
  /** message | add_friend | … (from the request's config). */
  campaignAction: string;
  repeat: ScheduleRepeat;
  timeOfDay: string; // "HH:mm" — đầu khung giờ (once/daily) hoặc cả hourly
  /** Cuối khung giờ; null = giờ cố định (không random) cho once/daily, hoặc
   * hết ngày (23:59) cho hourly. */
  timeOfDayEnd: string | null;
  intervalDays: number; // dùng khi repeat === "daily"
  intervalHours: number; // dùng khi repeat === "hourly"
  fromDate: string; // "YYYY-MM-DD"
  toDate: string | null;
  enabled: boolean;
  skipFailed: boolean;
  skipSucceeded: boolean;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
};

export const REPEAT_LABEL: Record<ScheduleRepeat, string> = {
  once: "Một lần",
  daily: "Theo ngày",
  hourly: "Theo giờ",
};
