import type { NextConfig } from "next";
import path from "path";

const apiUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api";

const nextConfig: NextConfig = {
  output: "standalone",
  // Required for monorepo: trace file dependencies from the repo root so that
  // workspace packages (e.g. packages/types) are included in the standalone output.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Required for monorepo: allow Turbopack to compile files outside the app directory.
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
