import "server-only";
import type { API } from "zca-js";
import { be } from "./be-client";
import { connectionManager, type Auth } from "./connection-manager";

/** Fields safe to send to the browser (no cookies/imei). */
export type AccountPublic = {
  zaloId: string;
  fullName: string;
  avatarUrl: string;
  phone: string;
  isBusiness: boolean;
  isActive: boolean;
  connected: boolean;
  labelIds: number[];
  proxyId: number | null;
  createdAt: string;
  lastSeen: string | null;
};

/** What BE returns before `connected` (computed locally: only this Next
 * process actually holds the live zca-js connection). */
type BeAccountPublic = Omit<AccountPublic, "connected">;

type BeSession = {
  zaloId: string;
  cookies: string;
  imei: string;
  userAgent: string;
  proxy: Auth["proxy"];
  phone: string;
};

function withConnected(row: BeAccountPublic): AccountPublic {
  return { ...row, connected: connectionManager.isConnected(row.zaloId) };
}

export async function listAccounts(): Promise<AccountPublic[]> {
  const rows = await be<BeAccountPublic[]>("/accounts");
  return rows.map(withConnected);
}

export async function getAccountRow(
  zaloId: string,
): Promise<AccountPublic | undefined> {
  try {
    return withConnected(await be<BeAccountPublic>(`/accounts/${zaloId}`));
  } catch {
    return undefined;
  }
}

export async function upsertAccount(input: {
  zaloId: string;
  fullName: string;
  avatarUrl: string;
  phone: string;
  isBusiness: boolean;
  imei: string;
  userAgent: string;
  cookies: string; // plaintext JSON; BE encrypts it before storing
}): Promise<void> {
  await be("/accounts", { method: "POST", body: input });
}

export async function removeAccount(zaloId: string): Promise<void> {
  connectionManager.disconnect(zaloId);
  await be(`/accounts/${zaloId}`, { method: "DELETE" });
}

/** Best-effort — never block a request on this. */
export function touchLastSeen(zaloId: string): void {
  void be(`/accounts/${zaloId}/touch-last-seen`, { method: "PATCH" }).catch(
    () => {
      /* not critical */
    },
  );
}

/**
 * Pull display name / phone / avatar / business flag from Zalo and store them.
 * The QR-scan payload only carries name + avatar, never the phone number.
 */
export async function refreshProfile(zaloId: string, api: API): Promise<void> {
  try {
    const { profile } = await api.fetchAccountInfo();
    let isBusiness = false;
    try {
      const biz = await api.getBizAccount(zaloId);
      isBusiness = Boolean(biz?.biz);
    } catch {
      /* personal account */
    }
    await be(`/accounts/${zaloId}/profile`, {
      method: "PATCH",
      body: {
        fullName: profile.displayName || profile.zaloName || "",
        phone: profile.phoneNumber || "",
        avatarUrl: profile.avatar || "",
        isBusiness,
      },
    });
  } catch {
    /* leave stored values as-is */
  }
}

/** Decrypted login session of an account, for handing to zca-js. */
export async function getSessionFor(zaloId: string): Promise<Auth> {
  const s = await be<BeSession>(`/accounts/${zaloId}/session`);
  return {
    zaloId: s.zaloId,
    cookies: s.cookies,
    imei: s.imei,
    userAgent: s.userAgent,
    proxy: s.proxy,
  };
}

/** Resolve a connected zca-js API for an account, connecting on demand. */
export async function getApiFor(zaloId: string): Promise<API> {
  // Already connected: skip the BE round-trip entirely (hot path — this runs
  // on nearly every /api/zalo/* request).
  if (connectionManager.isConnected(zaloId)) {
    touchLastSeen(zaloId);
    return connectionManager.getOrCreate(
      { zaloId, cookies: "", imei: "", userAgent: "" },
      { startListener: true },
    );
  }

  const s = await be<BeSession>(`/accounts/${zaloId}/session`);
  const api = await connectionManager.getOrCreate(
    {
      zaloId: s.zaloId,
      cookies: s.cookies,
      imei: s.imei,
      userAgent: s.userAgent,
      proxy: s.proxy,
    },
    { startListener: true },
  );
  touchLastSeen(zaloId);
  if (!s.phone) void refreshProfile(zaloId, api);
  return api;
}

/** Assign / clear an account's proxy, then rebuild its connection. */
export async function setAccountProxy(
  zaloId: string,
  proxyId: number | null,
): Promise<void> {
  await be(`/accounts/${zaloId}/proxy`, { method: "PATCH", body: { proxyId } });
  const session = await getSessionFor(zaloId);
  await connectionManager.reconnect(session);
}

/** Force a fresh connection for one account. */
export async function reconnectAccount(zaloId: string): Promise<boolean> {
  try {
    const session = await getSessionFor(zaloId);
    const api = await connectionManager.reconnect(session);
    await refreshProfile(zaloId, api);
    return true;
  } catch {
    return false;
  }
}

/** Reconnect every stored active account (called lazily on first API hit). */
export async function restoreAll(): Promise<void> {
  const sessions = await be<BeSession[]>("/accounts/active-sessions");
  await Promise.allSettled(
    sessions.map(async (s) => {
      const auth: Auth = {
        zaloId: s.zaloId,
        cookies: s.cookies,
        imei: s.imei,
        userAgent: s.userAgent,
        proxy: s.proxy,
      };
      const api = await connectionManager.getOrCreate(auth, {
        startListener: true,
      });
      if (!s.phone) await refreshProfile(s.zaloId, api);
    }),
  );
}
