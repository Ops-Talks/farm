import { NextRequest, NextResponse } from "next/server";

// Runtime proxy for API and admin paths. Using Next.js Middleware instead of
// next.config.ts rewrites so that API_INTERNAL_URL is read at request time
// from the container environment — not baked at image build time.
const UPSTREAM_BASE = (() => {
  const apiInternal =
    process.env.API_INTERNAL_URL ?? "http://localhost:3000/api";
  return apiInternal.replace(/\/api\/?$/, "");
})();

export function proxy(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;
  const upstreamUrl = `${UPSTREAM_BASE}${pathname}${search}`;
  return NextResponse.rewrite(new URL(upstreamUrl));
}

export const config = {
  matcher: [
    // All versioned API routes served by NestJS.
    "/api/v1/:path*",
    // Bull Board and other admin routes mounted without the /api prefix.
    "/admin/:path*",
  ],
};
