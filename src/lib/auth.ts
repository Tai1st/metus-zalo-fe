import { NextResponse } from "next/server";

// Phiên đăng nhập = JWT do backend (metus-zalo-be) cấp, lưu trong cookie httpOnly.
// Next không giữ khoá ký: mỗi phiên được backend xác nhận (có cache ngắn) nên
// tài khoản bị khoá / xoá mất hiệu lực sau tối đa CACHE_MS.
export const SESSION_COOKIE = "mz_session";

const CACHE_MS = 30_000; // tin kết quả xác nhận trong 30s
const STALE_MS = 10 * 60_000; // backend tạm chết: phiên đã xác nhận gần đây vẫn dùng được

type Entry = { ok: boolean; at: number };
const g = globalThis as unknown as { __mzSessions?: Map<string, Entry> };
const cache = (g.__mzSessions ??= new Map<string, Entry>());

/** Địa chỉ API backend, ví dụ http://127.0.0.1:4100/api */
export function backendUrl(): string {
  const base = process.env.ZALO_BE_URL ?? "http://127.0.0.1:4100";
  return `${base.replace(/\/$/, "")}/api`;
}

/** Thời điểm hết hạn (giây) đọc từ payload JWT — không kiểm chữ ký, chỉ để bỏ qua token đã hết hạn. */
export function tokenExpiry(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

export async function verifySession(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const exp = tokenExpiry(token);
  if (exp === null || exp * 1000 <= Date.now()) return false;

  const hit = cache.get(token);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.ok;

  try {
    const res = await fetch(`${backendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok || res.status === 401 || res.status === 403) {
      if (cache.size > 500) cache.clear();
      cache.set(token, { ok: res.ok, at: Date.now() });
      return res.ok;
    }
  } catch {
    /* backend không phản hồi — xét bên dưới */
  }
  // Lỗi tạm thời (mạng / 5xx / bị giới hạn tốc độ): không đăng xuất người đang dùng.
  return !!hit?.ok && Date.now() - hit.at < STALE_MS;
}

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  /** BE's Role enum has a third value, "staff" (nhân sự tạo qua "Quản lý truy
   * cập"); everything here checks `=== "admin"`, so "user"/"staff" both fall
   * into the restricted branch without needing special-casing "staff". */
  role: "admin" | "user" | "staff";
  /** Customer only: how many staff the active plan allows (0 = none). */
  staffLimit?: number;
  /** Staff only: id of the leader (customer) that owns this employee. */
  ownerId?: string;
  /** Zalo account ids this user may use — meaningless for role "admin" (full access). */
  allowedZaloIds: string[];
};

type UserEntry = { user: SessionUser | null; at: number };
const userCache = (g as unknown as { __mzUsers?: Map<string, UserEntry> }).__mzUsers ??=
  new Map<string, UserEntry>();

/**
 * Full current-user info (role + allowed Zalo accounts) for access checks —
 * separate from `verifySession`'s plain ok/not-ok cache. Returns null for no
 * session / an expired or invalid one.
 */
export async function getSessionUser(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  const exp = tokenExpiry(token);
  if (exp === null || exp * 1000 <= Date.now()) return null;

  const hit = userCache.get(token);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.user;

  try {
    const res = await fetch(`${backendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const user = (await res.json()) as SessionUser;
      if (userCache.size > 500) userCache.clear();
      userCache.set(token, { user, at: Date.now() });
      return user;
    }
    if (res.status === 401 || res.status === 403) {
      userCache.set(token, { user: null, at: Date.now() });
      return null;
    }
  } catch {
    /* backend tạm không phản hồi — dùng lại kết quả gần nhất nếu còn mới */
  }
  return hit && Date.now() - hit.at < STALE_MS ? hit.user : null;
}

/**
 * Xoá cache của một phiên — gọi ngay sau khi cấp quyền một zaloId mới cho
 * người dùng, để lệnh gọi kế tiếp (vd. gắn proxy) đọc lại allowedZaloIds mới
 * thay vì bản cache cũ (tối đa CACHE_MS) chưa có zaloId vừa cấp.
 */
export function invalidateSessionUser(token: string | undefined): void {
  if (token) userCache.delete(token);
}

/** Vượt qua giới hạn tài khoản Zalo được gán (admin luôn qua). */
export function canAccessZalo(user: SessionUser, zaloId: string): boolean {
  return user.role === "admin" || user.allowedZaloIds.includes(zaloId);
}

/** Mọi id trong danh sách đều được phép — dùng khi tạo/sửa chiến dịch (accountIds[]). */
export function allZaloAllowed(user: SessionUser, zaloIds: string[]): boolean {
  return zaloIds.every((id) => canAccessZalo(user, id));
}

/** Ít nhất một tài khoản của chiến dịch/lịch trình nằm trong quyền — dùng để lọc/chặn xem. */
export function anyZaloAllowed(user: SessionUser, zaloIds: string[]): boolean {
  return user.role === "admin" || zaloIds.some((id) => canAccessZalo(user, id));
}

/**
 * Cho các route nhận thẳng `zaloId` qua path param (không qua `withAccount`,
 * vốn chỉ đọc `?account=`) — trả về SessionUser nếu hợp lệ + được phép dùng
 * zaloId đó, hoặc một Response lỗi (401/403) để trả thẳng về client.
 */
export async function requireZaloAccess(
  req: { cookies: { get(name: string): { value?: string } | undefined } },
  zaloId: string,
): Promise<
  | { user: SessionUser; response?: undefined }
  | { user?: undefined; response: NextResponse }
> {
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return {
      response: NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 }),
    };
  }
  if (!canAccessZalo(user, zaloId)) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Không tìm thấy tài khoản" },
        { status: 404 },
      ),
    };
  }
  return { user };
}

export class BeAsUserError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Call a real (JWT-guarded, role-checked) backend route as the current user
 * — e.g. `/users` (admin-only staff management). Unlike `be()` in
 * server/zalo/be-client.ts, this forwards the user's own Bearer token
 * instead of the shared internal key, so backend-side RBAC (`@Roles`) applies.
 */
export async function beAsUser<T>(
  token: string,
  path: string,
  init?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${backendUrl()}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new BeAsUserError("Không kết nối được máy chủ, vui lòng thử lại sau", 502);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new BeAsUserError(msg || `Lỗi máy chủ (${res.status})`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
