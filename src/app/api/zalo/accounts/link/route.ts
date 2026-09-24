import type { NextRequest } from "next/server";
import { Zalo } from "zca-js";
import { fail, ok } from "@/server/zalo/http";
import { imageMetadataGetter } from "@/server/zalo/connection-manager";
import {
  DEFAULT_USER_AGENT,
  persistLoggedInApi,
} from "@/server/zalo/login-controller";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Link an account by pasting IMEI + Cookies (+ optional User-Agent). */
export async function POST(req: NextRequest) {
  let body: { imei?: string; cookies?: string; userAgent?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Body không hợp lệ");
  }

  const imei = body.imei?.trim();
  const rawCookies = body.cookies?.trim();
  if (!imei) return fail("Thiếu IMEI");
  if (!rawCookies) return fail("Thiếu Cookies");

  let cookie: unknown;
  try {
    cookie = JSON.parse(rawCookies);
  } catch {
    return fail("Cookies phải là JSON hợp lệ (mảng cookie hoặc jar đã serialize)");
  }

  try {
    const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
    const zalo = new Zalo({ imageMetadataGetter, selfListen: true });
    const api = await zalo.login({
      cookie: cookie as never,
      imei,
      userAgent: body.userAgent?.trim() || DEFAULT_USER_AGENT,
    });
    const zaloId = await persistLoggedInApi(
      api,
      undefined,
      user && user.role !== "admin" ? user.id : undefined,
    );
    return ok({ zaloId }, { status: 201 });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Link tài khoản thất bại",
      500,
    );
  }
}
