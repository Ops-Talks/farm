/**
 * Next.js middleware — enforces Content-Security-Policy on every application
 * response.
 *
 * CSP is set here rather than in next.config.ts headers() because the
 * headers() callback is evaluated at `next build` time and cannot read
 * runtime environment variables such as PLAYWRIGHT_E2E. Middleware modules
 * are loaded when the server process starts, so module-level process.env
 * reads always reflect the actual server environment.
 *
 * Policy tiers
 * - Development (NODE_ENV=development): permissive — unsafe-inline, unsafe-eval,
 *   and WebSocket connections so HMR and React DevTools work.
 * - Playwright E2E (PLAYWRIGHT_E2E=1): same as development — Next.js 16 App
 *   Router emits inline bootstrap scripts (self.__next_f) that would be blocked
 *   by a strict policy, preventing React from hydrating in the test browser.
 * - Production: strict — script-src and connect-src restricted to 'self'.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// These are read once at server startup — process.env is the live Node.js
// environment for the standalone server, not bundled at compile time.
// (Only NEXT_PUBLIC_* vars are inlined into client bundles by Next.js.)
const isDev = process.env.NODE_ENV === "development";
const isE2E = process.env.PLAYWRIGHT_E2E === "1";

// Script source directive:
// - Development / E2E: allow inline scripts and eval so Next.js HMR, React
//   DevTools, and Next.js 16 App Router inline hydration scripts work.
// - Production: restrict to same-origin only.
const scriptSrc =
  isDev || isE2E ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'";

// Connect source directive:
// - Development / E2E: allow WebSocket connections (Next.js HMR) and any
//   localhost port (local API servers, dev proxies, etc.).
// - Production: same-origin only.
const connectSrc =
  isDev || isE2E ? "'self' ws: http://localhost:*" : "'self'";

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  // style-src keeps 'unsafe-inline' because Tailwind CSS and shadcn/ui inject
  // inline styles at runtime; tighten with style nonces if needed later.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", CSP);
  return response;
}

// Mirror the source pattern used in next.config.ts headers() so that CSP
// applies to all application routes but skips immutable static assets where
// the header adds overhead without benefit.
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
