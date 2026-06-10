import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: false,
  output: "standalone",
  compress: true,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
