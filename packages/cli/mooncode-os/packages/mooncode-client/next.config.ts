import type { NextConfig } from "next";

// `output: "export"` produces a static bundle in `out/` that the mooncode
// plugin serves at /plugins/mooncodeos. basePath/assetPrefix make the emitted
// HTML reference assets under /plugins/mooncodeos/* so the plugin route resolves
// them. Set NEXT_OUTPUT=server to disable export (e.g. for `pnpm dev`).
const isStaticExport = process.env["NEXT_OUTPUT"] !== "server";

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" as const, basePath: "/plugins/mooncodeos", assetPrefix: "/plugins/mooncodeos" } : {}),
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
