import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@stride/shared", "@stride/api"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
