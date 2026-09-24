import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // zca-js is a Node-only library (websocket, tough-cookie, native-ish deps).
  // Keep it out of the bundler so it runs as a normal CommonJS/ESM dependency.
  serverExternalPackages: [
    "zca-js",
    "better-sqlite3",
    "https-proxy-agent",
    "socks-proxy-agent",
  ],
};

export default nextConfig;
