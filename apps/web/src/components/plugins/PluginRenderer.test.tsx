import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/lib/api-client", () => ({
  getAccessToken: () => "test-token",
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { PluginRenderer } from "@/components/plugins/PluginRenderer";
import { toast } from "sonner";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MockLazyComponent = ({ title }: { title?: string }) => (
  <div data-testid="lazy-component">{title ?? "Lazy Plugin Loaded"}</div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function fireMessageEvent(data: unknown, origin = "https://plugin.example.com") {
  const event = new MessageEvent("message", { data, origin });
  window.dispatchEvent(event);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PluginRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── ST382: iframe mode renders sandboxed iframe ─────────────────────────────

  describe("iframe mode (FARM-ST382)", () => {
    it("renders an <iframe> with sandbox='allow-scripts allow-same-origin' and the entryPoint as src", () => {
      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      const iframe = screen.getByTitle("Plugin");
      expect(iframe.tagName).toBe("IFRAME");
      expect(iframe).toHaveAttribute("src", "https://plugin.example.com/widget.html");
      expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-same-origin");
    });
  });

  // ── ST383: React.lazy dynamic import and Suspense skeleton ─────────────────

  describe("route mode (FARM-ST383)", () => {
    it("renders the lazily-loaded component inside Suspense after resolution", async () => {
      // Use the loader prop to inject a resolved module directly, bypassing
      // the real dynamic import (which would fail in the test environment).
      const loader = () =>
        Promise.resolve({ default: MockLazyComponent as React.ComponentType<Record<string, unknown>> });

      render(
        <PluginRenderer
          mode="route"
          entryPoint="https://cdn.example.com/plugin.js"
          componentProps={{ title: "Hello Plugin" }}
          loader={loader}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("lazy-component")).toBeInTheDocument();
      });
      expect(screen.getByText("Hello Plugin")).toBeInTheDocument();
    });

    it("shows skeleton loading fallback while the lazy component is pending", async () => {
      // Use a never-resolving promise so the component stays in the Suspense
      // loading state and shows the skeleton fallback.
      let resolve!: (value: { default: React.ComponentType<Record<string, unknown>> }) => void;
      const neverResolves = new Promise<{ default: React.ComponentType<Record<string, unknown>> }>(
        (r) => {
          resolve = r;
        },
      );
      const loader = () => neverResolves;

      render(
        <PluginRenderer
          mode="route"
          entryPoint="https://cdn.example.com/plugin.js"
          loader={loader}
        />,
      );

      // Skeleton should be visible while the lazy import is pending.
      expect(screen.getByTestId("plugin-skeleton")).toBeInTheDocument();

      // Resolve to avoid "act" warnings from the unresolved promise.
      await act(async () => {
        resolve({ default: MockLazyComponent as React.ComponentType<Record<string, unknown>> });
      });
    });
  });

  // ── ST384: farm:navigate postMessage calls router.push ──────────────────────

  describe("postMessage bridge (FARM-ST384)", () => {
    it("calls router.push with the provided path when a farm:navigate message is received", async () => {
      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      await act(async () => {
        fireMessageEvent(
          { type: "farm:navigate", path: "/catalog" },
          "https://plugin.example.com",
        );
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/catalog");
    });
  });

  // ── ST385: farm:api-request from untrusted origin is rejected ──────────────

  describe("postMessage security (FARM-ST385)", () => {
    it("rejects farm:api-request messages from an origin that does not match the plugin entryPoint host", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      await act(async () => {
        fireMessageEvent(
          { type: "farm:api-request", requestId: "1", method: "GET", url: "/api/v1/catalog" },
          "https://evil.attacker.com",
        );
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Rejected message from untrusted origin"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("evil.attacker.com"),
      );
      // toast should NOT have been called for the rejected message
      expect(toast).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("accepts farm:navigate messages from a trusted origin", async () => {
      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      await act(async () => {
        fireMessageEvent(
          { type: "farm:navigate", path: "/docs" },
          "https://plugin.example.com",
        );
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/docs");
    });

    it("rejects farm:navigate with an absolute URL to prevent open-redirect", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      await act(async () => {
        fireMessageEvent(
          { type: "farm:navigate", path: "https://evil.attacker.com" },
          "https://plugin.example.com",
        );
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("non-relative path"),
      );
      expect(mockRouterPush).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("rejects farm:api-request whose URL does not start with /api/v1/", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      await act(async () => {
        fireMessageEvent(
          { type: "farm:api-request", requestId: "x1", method: "GET", url: "https://evil.attacker.com/steal" },
          "https://plugin.example.com",
        );
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Rejected api-request to disallowed URL"),
      );

      consoleSpy.mockRestore();
    });

    it("rejects farm:api-request whose path is within /api/ but outside /api/v1/", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      await act(async () => {
        fireMessageEvent(
          { type: "farm:api-request", requestId: "x4", method: "GET", url: "/api/health" },
          "https://plugin.example.com",
        );
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Rejected api-request to disallowed URL"),
      );

      consoleSpy.mockRestore();
    });

    it("rejects farm:api-request with a path-traversal URL that escapes /api/", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      await act(async () => {
        fireMessageEvent(
          { type: "farm:api-request", requestId: "x3", method: "GET", url: "/api/../internal/secret" },
          "https://plugin.example.com",
        );
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Rejected api-request to disallowed URL"),
      );

      consoleSpy.mockRestore();
    });

    it("rejects farm:api-request with a disallowed HTTP method", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      await act(async () => {
        fireMessageEvent(
          { type: "farm:api-request", requestId: "x2", method: "TRACE", url: "/api/v1/catalog" },
          "https://plugin.example.com",
        );
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("disallowed HTTP method"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("farm:api-request proxy (FARM-ST386)", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("forwards a valid farm:api-request to /api/plugin-proxy with correct body", async () => {
      const responsePayload = { items: [{ id: "1" }] };
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(responsePayload),
      } as unknown as Response);

      render(
        <PluginRenderer
          mode="iframe"
          entryPoint="https://plugin.example.com/widget.html"
        />,
      );

      await act(async () => {
        fireMessageEvent(
          { type: "farm:api-request", requestId: "r1", method: "GET", url: "/api/v1/catalog" },
          "https://plugin.example.com",
        );
      });

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          "/api/plugin-proxy",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("/api/v1/catalog"),
          }),
        );
      });
    });
  });
});
