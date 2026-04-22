import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost/api/plugin-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/plugin-proxy", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const req = new NextRequest("http://localhost/api/plugin-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Invalid request body" });
  });

  it("returns 400 when path does not start with /api/v1/", async () => {
    const req = makeRequest({ path: "/api/health", method: "GET" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Disallowed path" });
  });

  it("returns 400 when path contains a path traversal sequence", async () => {
    const req = makeRequest({ path: "/api/v1/../health", method: "GET" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Disallowed path" });
  });

  it("returns 400 when method is not allowed", async () => {
    const req = makeRequest({ path: "/api/v1/catalog", method: "TRACE" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ error: "Disallowed method" });
  });

  it("proxies a GET request and returns the upstream response", async () => {
    const upstreamData = { items: [] };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: vi.fn().mockResolvedValueOnce(upstreamData),
    } as unknown as Response);

    const req = makeRequest({ path: "/api/v1/catalog", method: "GET" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(upstreamData);

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [calledUrl, calledInit] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toMatch(/\/api\/v1\/catalog$/);
    expect(calledInit.method).toBe("GET");
  });

  it("proxies a POST request with a body", async () => {
    const upstreamData = { id: "abc" };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 201,
      json: vi.fn().mockResolvedValueOnce(upstreamData),
    } as unknown as Response);

    const req = makeRequest({
      path: "/api/v1/catalog",
      method: "POST",
      body: { name: "my-service" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual(upstreamData);

    const [, calledInit] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledInit.method).toBe("POST");
    expect(calledInit.body).toBe(JSON.stringify({ name: "my-service" }));
  });

  it("forwards the Authorization header to the upstream", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: vi.fn().mockResolvedValueOnce({}),
    } as unknown as Response);

    const req = makeRequest({ path: "/api/v1/catalog", method: "GET" }, { Authorization: "Bearer tok" });
    await POST(req);

    const [, calledInit] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer tok");
  });

  it("omits the Authorization header when none is provided", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: vi.fn().mockResolvedValueOnce({}),
    } as unknown as Response);

    const req = makeRequest({ path: "/api/v1/catalog", method: "GET" });
    await POST(req);

    const [, calledInit] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("returns 502 when the upstream fetch throws", async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Connection refused"));

    const req = makeRequest({ path: "/api/v1/catalog", method: "GET" });
    const res = await POST(req);

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data).toEqual({ error: "Connection refused" });
  });

  it("preserves a non-200 upstream status code", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 404,
      json: vi.fn().mockResolvedValueOnce({ message: "Not found" }),
    } as unknown as Response);

    const req = makeRequest({ path: "/api/v1/catalog/missing", method: "GET" });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("handles a null body gracefully (does not send body for GET)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      status: 200,
      json: vi.fn().mockResolvedValueOnce([]),
    } as unknown as Response);

    const req = makeRequest({ path: "/api/v1/catalog", method: "GET", body: null });
    await POST(req);

    const [, calledInit] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledInit.body).toBeUndefined();
  });
});
