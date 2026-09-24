import "server-only";
import crypto from "node:crypto";
import { type API, LoginQRCallbackEventType, Zalo } from "zca-js";
import type { LoginStage } from "@/lib/types";
import { upsertAccount } from "./accounts";
import { connectionManager, imageMetadataGetter } from "./connection-manager";
import { be } from "./be-client";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/**
 * Persist a freshly logged-in zca-js API instance as an account row + adopt its
 * connection. Shared by QR login and the manual "Link Account" flow.
 */
export async function persistLoggedInApi(
  api: API,
  scanned?: { display_name?: string; avatar?: string },
  grantToUserId?: string,
): Promise<string> {
  const ctx = api.getContext();
  const zaloId = api.getOwnId();
  if (!zaloId || !ctx) throw new Error("Đăng nhập thất bại");

  const cookies = JSON.stringify(ctx.cookie.serializeSync());
  const authKey = Buffer.from(cookies).toString("base64");

  let fullName = scanned?.display_name ?? "";
  let avatarUrl = scanned?.avatar ?? "";
  let phone = "";
  let isBusiness = false;
  try {
    const { profile } = await api.fetchAccountInfo();
    fullName = profile.displayName || profile.zaloName || fullName;
    avatarUrl = profile.avatar || avatarUrl;
    phone = profile.phoneNumber || "";
  } catch {
    /* keep the scanned fallback */
  }
  try {
    const biz = await api.getBizAccount(zaloId);
    isBusiness = Boolean(biz?.biz);
  } catch {
    /* personal account */
  }

  await upsertAccount({
    zaloId,
    fullName,
    avatarUrl,
    phone,
    isBusiness,
    imei: ctx.imei,
    userAgent: ctx.userAgent,
    cookies,
  });
  connectionManager.adopt(zaloId, authKey, api);

  if (grantToUserId) {
    try {
      await be(`/${grantToUserId}/zalo-ids`, { method: "POST", body: { zaloId } }, "/users");
    } catch {
      /* best-effort — an admin can still grant access manually via Quản lý truy cập */
    }
  }

  return zaloId;
}

type QrSession = {
  tempId: string;
  stage: LoginStage;
  qrImage?: string;
  scannedUser?: { display_name: string; avatar: string };
  zaloId?: string;
  error?: string;
  abort?: () => void;
  createdAt: number;
};

const SESSION_TTL_MS = 5 * 60 * 1000;

class LoginController {
  private sessions = new Map<string, QrSession>();

  start(grantToUserId?: string): string {
    this.sweep();
    const tempId = crypto.randomUUID();
    const session: QrSession = {
      tempId,
      stage: "starting",
      createdAt: Date.now(),
    };
    this.sessions.set(tempId, session);

    const zalo = new Zalo({ imageMetadataGetter, selfListen: true });
    zalo
      .loginQR({}, (event) => {
        switch (event.type) {
          case LoginQRCallbackEventType.QRCodeGenerated: {
            const img = event.data.image;
            session.stage = "qr_ready";
            session.qrImage = img.startsWith("data:")
              ? img
              : `data:image/png;base64,${img}`;
            session.abort = event.actions.abort;
            break;
          }
          case LoginQRCallbackEventType.QRCodeScanned:
            session.stage = "scanned";
            session.scannedUser = event.data;
            break;
          case LoginQRCallbackEventType.QRCodeDeclined:
            session.stage = "declined";
            break;
          case LoginQRCallbackEventType.QRCodeExpired:
            session.stage = "expired";
            break;
        }
      })
      .then(async (api) => {
        session.zaloId = await persistLoggedInApi(
          api,
          session.scannedUser,
          grantToUserId,
        );
        session.stage = "connected";
      })
      .catch((err: unknown) => {
        session.stage = "error";
        session.error = err instanceof Error ? err.message : String(err);
      });

    return tempId;
  }

  get(tempId: string): Omit<QrSession, "abort"> | undefined {
    const s = this.sessions.get(tempId);
    if (!s) return undefined;
    const { abort: _abort, ...rest } = s;
    void _abort;
    return rest;
  }

  cancel(tempId: string): void {
    const s = this.sessions.get(tempId);
    if (!s) return;
    try {
      s.abort?.();
    } catch {
      /* ignore */
    }
    this.sessions.delete(tempId);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now - s.createdAt > SESSION_TTL_MS) this.sessions.delete(id);
    }
  }
}

const globalRef = globalThis as unknown as { __zaloLogin?: LoginController };
export const loginController: LoginController =
  globalRef.__zaloLogin ?? (globalRef.__zaloLogin = new LoginController());
