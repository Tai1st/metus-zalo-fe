import "server-only";
import { be, isNotFound } from "./be-client";

export type Proxy = {
  id: number;
  label: string;
  protocol: "http" | "socks5";
  host: string;
  port: number;
  username: string;
  password: string;
  isActive: boolean;
  createdAt: string;
};

export function listProxies(): Promise<Proxy[]> {
  return be<Proxy[]>("/proxies");
}

export type ProxyInput = {
  label: string;
  protocol: "http" | "socks5";
  host: string;
  port: number;
  username: string;
  password: string;
  isActive: boolean;
};

export function createProxy(input: ProxyInput): Promise<Proxy> {
  return be<Proxy>("/proxies", { method: "POST", body: input });
}

export async function updateProxy(
  id: number,
  input: ProxyInput,
): Promise<Proxy | undefined> {
  try {
    return await be<Proxy>(`/proxies/${id}`, { method: "PUT", body: input });
  } catch (err) {
    if (isNotFound(err)) return undefined;
    throw err;
  }
}

export async function deleteProxy(id: number): Promise<void> {
  await be(`/proxies/${id}`, { method: "DELETE" });
}

/** Validate a raw request body into a ProxyInput, or return an error message. */
export function parseProxyBody(
  body: Record<string, unknown>,
): ProxyInput | string {
  const host = String(body.host ?? "").trim();
  const port = Number(body.port);
  if (!host) return "Thiếu host";
  if (!Number.isInteger(port) || port <= 0) return "Port không hợp lệ";
  return {
    label: String(body.label ?? "").trim(),
    protocol: body.protocol === "socks5" ? "socks5" : "http",
    host,
    port,
    username: String(body.username ?? "").trim(),
    password: String(body.password ?? ""),
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  };
}
