import type { NextConfig } from "next";
import path from "path";

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
  async headers() {
    return [
      {
        // Scope security headers to all application routes but skip static
        // asset paths. _next/static and _next/image files are immutable,
        // content-hashed bundles — headers add overhead there.
        // favicon.ico is excluded for the same reason.
        // Reference: https://nextjs.org/docs/app/guides/content-security-policy
        //
        // NOTE: Content-Security-Policy is intentionally absent here.
        // CSP must be dynamic (dev / E2E = permissive, prod = strict) and
        // next.config.ts headers() is evaluated at build time, so it cannot
        // read runtime env vars like PLAYWRIGHT_E2E. CSP is set in
        // src/middleware.ts which executes at request time.
        source: "/((?!_next/static|_next/image|favicon\\.ico).*)",
        headers: [
          // Enforce HTTPS for one year, including all subdomains.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Prevent the app from being embedded in an iframe on any other origin.
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Stop browsers from MIME-sniffing the declared content type.
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Send the full origin only when navigating within the same origin;
          // send only the origin (no path) for cross-origin navigations.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Opt out of browser features that are not used by this application.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
