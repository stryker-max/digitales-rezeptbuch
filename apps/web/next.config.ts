import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true, agentRules: false,
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] }, { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Content-Type-Options", value: "nosniff" }] }];
  },
};

export default config;
