import type { NextConfig } from "next";

const isStaticBuild = process.env.NEXT_PUBLIC_DATA_SOURCE === "static";

const nextConfig: NextConfig = {
  // Enable static export only when building for GitHub Pages.
  // Set NEXT_PUBLIC_DATA_SOURCE=static in CI to activate this mode.
  output: isStaticBuild ? "export" : undefined,
  // Use trailing slashes so GitHub Pages serves /features/foo/index.html
  // correctly when accessed as /features/foo/.
  trailingSlash: isStaticBuild,
};

export default nextConfig;
