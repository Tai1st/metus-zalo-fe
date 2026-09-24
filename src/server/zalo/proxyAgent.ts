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

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

/**
 * Connect through the proxy to an IPv4-only echo service. Succeeds only when
 * the proxy works AND its exit address is IPv4 (an IPv6-only proxy cannot
 * reach the IPv4-only endpoint). Returns an error message or the exit IP.
 */
export async function checkIpv4Proxy(
  p: ProxyLike,
): Promise<{ ok: true; ip: string } | { ok: false; error: string }> {
  if (p.host.includes(":")) {
    return { ok: false, error: "Chỉ nhận proxy IPv4 (host không được là địa chỉ IPv6)" };
  }
  const { request } = await import("node:https");
  return new Promise((resolve) => {
    const req = request(
      "https://api.ipify.org",
      { agent: buildProxyAgent(p), timeout: 10_000, method: "GET" },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          const ip = body.trim();
          if (res.statusCode === 407) {
            resolve({ ok: false, error: "Proxy từ chối tài khoản/mật khẩu (407)" });
          } else if (res.statusCode === 200 && IPV4.test(ip)) {
            resolve({ ok: true, ip });
          } else {
            resolve({ ok: false, error: "Proxy không phải IPv4 hoặc không truy cập được internet" });
          }
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "Proxy không phản hồi (quá 10 giây)" });
    });
    req.on("error", (e) =>
      resolve({ ok: false, error: "Không kết nối được qua proxy: " + e.message }),
    );
    req.end();
  });
}
