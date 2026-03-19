import type { NextConfig } from "next";
import path from "path";

const apiUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api";

// Base URL without the /api suffix — used for routes that bypass NestJS global
// prefix (e.g. Bull Board at /admin/queues).
const apiBaseUrl = apiUrl.replace(/\/api$/, "");

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
      {
        // Bull Board is mounted at /admin/queues on the API server — it does
        // not carry the /api global prefix used by NestJS controllers.
        source: "/admin/:path*",
        destination: `${apiBaseUrl}/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
