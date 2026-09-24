import type { NextRequest } from "next/server";
import { getApiFor } from "@/server/zalo/accounts";
import { connectionManager } from "@/server/zalo/connection-manager";

export const dynamic = "force-dynamic";

/** Server-sent events: pushes every new message for an account as it arrives. */
export async function GET(req: NextRequest) {
  const zaloId = req.nextUrl.searchParams.get("account")?.trim();
  if (!zaloId) return new Response("Thiếu tham số account", { status: 400 });
  try {
    await getApiFor(zaloId); // make sure the account is connected and listening
  } catch {
    return new Response("Không kết nối được tài khoản", { status: 500 });
  }

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const unsubscribe = connectionManager.subscribe(zaloId, (m) =>
        send(`data: ${JSON.stringify({ threadId: m.threadId, id: m.id })}\n\n`),
      );
      const beat = setInterval(() => send(": ping\n\n"), 25000);
      cleanup = () => {
        clearInterval(beat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", cleanup);
      send("retry: 2000\n\n");
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
