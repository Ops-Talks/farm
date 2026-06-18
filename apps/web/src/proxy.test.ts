/**
 * Tests for src/proxy.ts.
 *
 * Covers: URL rewriting for /api/v1/* and /admin/* paths, search-string
 * preservation, and the exported config.matcher array.
 *
 * Strategy: mock NextResponse.rewrite to capture the URL it receives.
 * Pass a plain object that satisfies the req.nextUrl shape used by the
 * middleware (pathname + search) — no real NextRequest needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// vi.hoisted ensures rewriteMock is available before vi.mock factory runs.
const { rewriteMock } = vi.hoisted(() => {
  const rewriteMock = vi.fn((url: URL) => ({ type: "rewrite", url }));
  return { rewriteMock };
});

vi.mock("next/server", () => ({
  NextResponse: { rewrite: rewriteMock },
}));

import { proxy, config } from "./proxy";

// Derive the expected upstream base the same way the module does at load time,
// so the test remains correct regardless of the CI environment.
const EXPECTED_BASE = (
  process.env.API_INTERNAL_URL ?? "http://localhost:3000/api"
).replace(/\/api\/?$/, "");

function makeReq(pathname: string, search = ""): NextRequest {
  return { nextUrl: { pathname, search } } as unknown as NextRequest;
}

describe("proxy", () => {
  beforeEach(() => {
    rewriteMock.mockClear();
  });

  describe("URL rewriting", () => {
    it("rewrites /api/v1/users to the upstream API", () => {
      proxy(makeReq("/api/v1/users"));

      expect(rewriteMock).toHaveBeenCalledTimes(1);
      const url: URL = rewriteMock.mock.calls[0][0];
      expect(url.toString()).toBe(`${EXPECTED_BASE}/api/v1/users`);
    });

    it("rewrites /api/v1/auth/login to the upstream API", () => {
      proxy(makeReq("/api/v1/auth/login"));

      const url: URL = rewriteMock.mock.calls[0][0];
      expect(url.toString()).toBe(`${EXPECTED_BASE}/api/v1/auth/login`);
    });

    it("preserves query string parameters", () => {
      proxy(makeReq("/api/v1/catalog/components", "?limit=20&page=2"));

      const url: URL = rewriteMock.mock.calls[0][0];
      expect(url.toString()).toBe(
        `${EXPECTED_BASE}/api/v1/catalog/components?limit=20&page=2`,
      );
    });

    it("rewrites /admin/queues to the upstream admin path", () => {
      proxy(makeReq("/admin/queues"));

      const url: URL = rewriteMock.mock.calls[0][0];
      expect(url.toString()).toBe(`${EXPECTED_BASE}/admin/queues`);
    });

    it("passes an empty search string when there are no query params", () => {
      proxy(makeReq("/api/v1/health", ""));

      const url: URL = rewriteMock.mock.calls[0][0];
      expect(url.search).toBe("");
    });
  });

  describe("config.matcher", () => {
    it("includes the versioned API path pattern", () => {
      expect(config.matcher).toContain("/api/v1/:path*");
    });

    it("includes the admin path pattern", () => {
      expect(config.matcher).toContain("/admin/:path*");
    });

    it("has exactly two matchers", () => {
      expect(config.matcher).toHaveLength(2);
    });
  });
});

