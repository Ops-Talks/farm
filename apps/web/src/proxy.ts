import { type NextRequest, NextResponse } from "next/server";

// API_INTERNAL_URL is read at request time from the runtime environment
// (e.g. Kubernetes ConfigMap envFrom). This is intentionally NOT evaluated at
// build time — using proxy.ts (Next.js Proxy) instead of next.config.ts rewrites
// is the official Next.js BFF pattern for runtime-injectable upstream URLs.
export function proxy(request: NextRequest): NextResponse {
  const apiBase =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3000/api";

  // /api/v1/auth/login → /v1/auth/login → http://farm-api:3000/api/v1/auth/login
  const subPath = request.nextUrl.pathname.replace(/^\/api/, "");
  const upstream = new URL(
    `${apiBase}${subPath}${request.nextUrl.search}`,
  );

  return NextResponse.rewrite(upstream);
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
