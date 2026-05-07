import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Vite app to proxy /dpe/* to this project
  async headers() {
    return [
      {
        source: "/dpe/:path*",
        headers: [{ key: "X-Robots-Tag", value: "index, follow" }],
      },
    ];
  },
};

export default nextConfig;
