import type { NextConfig } from "next";
import path from "path";

// Content Security Policy directive string.
// Uses 'unsafe-inline' and 'unsafe-eval' in script-src because Next.js requires
// them for hydration and dev mode HMR. Tighten with nonces or hashes once a
// nonce-based approach is wired through the middleware.
// connect-src includes ws:/wss: to allow the Socket.IO client to open WebSocket
// connections during development and in production.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' ws: wss: http://localhost:* https://*",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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
        // Apply security headers to every route.
        source: "/(.*)",
        headers: [
          // CSP is intentionally set in report-only mode so violations are
          // surfaced in the browser console without blocking the app.
          // Once the policy has been validated in production, switch the key
          // to "Content-Security-Policy" to enforce it.
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy,
          },
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
