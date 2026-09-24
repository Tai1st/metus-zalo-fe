import "server-only";
import type { Agent } from "node:http";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

export type ProxyLike = {
  protocol: "http" | "socks5";
  host: string;
  port: number;
  username: string;
  password: string;
};

/** Build an http.Agent that routes through the given proxy. */
export function buildProxyAgent(p: ProxyLike): Agent {
  const auth = p.username
    ? `${encodeURIComponent(p.username)}:${encodeURIComponent(p.password)}@`
    : "";
  const scheme = p.protocol === "socks5" ? "socks5" : "http";
  const url = `${scheme}://${auth}${p.host}:${p.port}`;
  return (
    p.protocol === "socks5"
      ? new SocksProxyAgent(url)
      : new HttpsProxyAgent(url)
  ) as unknown as Agent;
}
