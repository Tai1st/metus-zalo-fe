import "server-only";

/**
 * Tài khoản, proxy và nhãn giờ sống trong metus-zalo-be (MongoDB); đây là
 * client dùng chung để gọi các route /internal/zalo/* của nó. Cookie phiên
 * Zalo chỉ đi qua kênh này (khoá x-internal-key), không lộ ra browser.
 */
export class BeHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/**
 * @param prefix Which internal module to call — `/zalo` (accounts, proxies,
 * labels), `/chat` (messages, thread names, notification state), `/campaigns`,
 * `/schedules` or `/users` (granting a user their own Zalo account). Defaults
 * to `/zalo` so existing callers are unchanged.
 */
export async function be<T>(
  path: string,
  init?: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  },
  prefix:
    | "/zalo"
    | "/chat"
    | "/campaigns"
    | "/schedules"
    | "/leads"
    | "/users"
    | "/friend-requests" = "/zalo",
): Promise<T> {
  const base = process.env.ZALO_BE_URL;
  const key = process.env.ZALO_BE_KEY;
  if (!base || !key) {
    throw new Error("Chưa cấu hình ZALO_BE_URL / ZALO_BE_KEY");
  }

  let res: Response;
  try {
    res = await fetch(`${base.replace(/\/$/, "")}/api/internal${prefix}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": key,
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Không kết nối được dịch vụ BE (metus-zalo-be đã chạy chưa?)",
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const msg = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new BeHttpError(msg || `BE lỗi (${res.status})`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** true for a 404 from BE — callers decide whether that means "not found" or
 * "no-op", matching whatever the old SQLite call used to do for a bad id. */
export function isNotFound(err: unknown): boolean {
  return err instanceof BeHttpError && err.status === 404;
}
