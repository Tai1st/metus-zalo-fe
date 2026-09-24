/** Runs once when the server starts: bring every stored account online and
 * start the schedule loop, so messages arrive and schedules fire even when
 * nobody has the web UI open. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { restoreAll } = await import("@/server/zalo/accounts");
  const { ensureScheduler } = await import("@/server/zalo/scheduler");
  ensureScheduler();
  void restoreAll().catch(() => {
    /* accounts reconnect lazily on first API hit as a fallback */
  });
}
