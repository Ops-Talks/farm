import { NextRequest, NextResponse } from "next/server";

// Must match the client-side constant in PluginRenderer.tsx.
const ALLOWED_PATH_PREFIX = "/api/v1/";
const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

// Strip the trailing /api segment so that paths like /api/v1/catalog resolve
// correctly when appended to the base URL.
const UPSTREAM_BASE = (
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api"
).replace(/\/api\/?$/, "");

export async function POST(req: NextRequest): Promise<NextResponse> {
  let path: string;
  let method: string;
  let body: unknown;

  try {
    const payload = (await req.json()) as { path?: unknown; method?: unknown; body?: unknown };
    path = String(payload.path ?? "");
    method = String(payload.method ?? "GET").toUpperCase();
    body = payload.body ?? null;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!path.startsWith(ALLOWED_PATH_PREFIX) || path.includes("..")) {
    return NextResponse.json({ error: "Disallowed path" }, { status: 400 });
  }

  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: "Disallowed method" }, { status: 400 });
  }

  const upstreamUrl = `${UPSTREAM_BASE}${path}`;
  const authorization = req.headers.get("authorization");

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const data: unknown = await upstream.json().catch(() => null);
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
