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

  let upstream: URL;
  try {
    upstream = new URL(`${apiBase}${subPath}${request.nextUrl.search}`);
  } catch (error) {
    // Surface misconfiguration explicitly as a 502 instead of letting the
    // request crash with an unhandled 500. A malformed API_INTERNAL_URL
    // (missing scheme, invalid host) is an operator-side issue and should be
    // diagnosable from the response body and server logs.
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[proxy] Failed to construct upstream URL from API_INTERNAL_URL/NEXT_PUBLIC_API_URL: ${message}`,
    );
    return NextResponse.json(
      {
        statusCode: 502,
        message:
          "Proxy misconfiguration: upstream API URL is invalid. Check API_INTERNAL_URL/NEXT_PUBLIC_API_URL.",
        detail: message,
      },
      { status: 502 },
    );
  }

  return NextResponse.rewrite(upstream);
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
