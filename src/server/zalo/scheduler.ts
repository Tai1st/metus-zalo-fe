import "server-only";
import { campaignRunner } from "./campaign-runner";
import { computeNextRun, dueSchedules, markRan } from "./schedules";

const TICK_MS = 60_000;

async function tick(): Promise<void> {
  const now = Date.now();
  for (const s of await dueSchedules(now)) {
    try {
      campaignRunner.start(s.campaignId, {
        skipFailed: s.skipFailed,
        skipSucceeded: s.skipSucceeded,
      });
    } catch {
      /* runner will log its own errors */
    }
    const next =
      s.repeat === "once"
        ? null
        : computeNextRun(
            {
              repeat: s.repeat,
              timeOfDay: s.timeOfDay,
              timeOfDayEnd: s.timeOfDayEnd,
              intervalDays: s.intervalDays,
              intervalHours: s.intervalHours,
              fromDate: s.fromDate,
              toDate: s.toDate,
            },
            now,
          );
    await markRan(s.id, next);
  }
}

/** Start the 1-minute scheduler loop once per process. */
export function ensureScheduler(): void {
  const g = globalThis as unknown as { __zaloScheduler?: NodeJS.Timeout };
  if (g.__zaloScheduler) return;
  g.__zaloScheduler = setInterval(() => void tick(), TICK_MS);
  // run once shortly after boot so a just-due schedule doesn't wait a full minute
  setTimeout(() => void tick(), 3_000);
}
