"use client";

import React, {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccessToken } from "@/lib/api-client";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PluginRendererProps {
  /**
   * The entry point for the plugin.
   * - For route contributions: a dynamic module URL/path used with React.lazy.
   * - For iframe contributions: a full URL rendered inside a sandboxed iframe.
   */
  entryPoint: string;
  /**
   * Rendering mode:
   * - "route": loads the plugin module via React.lazy wrapped in <Suspense>.
   * - "iframe": renders a sandboxed <iframe> with postMessage bridge.
   */
  mode: "route" | "iframe";
  /** Additional props passed through to the lazily-loaded route component. */
  componentProps?: Record<string, unknown>;
  /**
   * Optional custom loader used for testing. When provided, overrides the
   * default dynamic import of entryPoint so tests can inject a resolved module
   * without relying on actual network requests or ESM spy limitations.
   */
  loader?: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>;
}

// ── Lazy-route mode ───────────────────────────────────────────────────────────

interface LazyPluginProps {
  entryPoint: string;
  componentProps?: Record<string, unknown>;
  loader?: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>;
}

function LazyPlugin({ entryPoint, componentProps, loader }: LazyPluginProps) {
  const LazyComponent = lazy(
    loader ?? (() => import(/* webpackIgnore: true */ entryPoint)),
  );

  return (
    <Suspense
      fallback={
        <div className="space-y-2 p-4" data-testid="plugin-skeleton">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      }
    >
      <LazyComponent {...(componentProps ?? {})} />
    </Suspense>
  );
}

// ── postMessage bridge types ──────────────────────────────────────────────────

type PluginMessage =
  | { type: "farm:navigate"; path: string }
  | { type: "farm:toast"; message: string; variant?: "success" | "error" | "info" }
  | { type: "farm:api-request"; requestId: string; method: string; url: string; body?: unknown };

// ── iframe mode ───────────────────────────────────────────────────────────────

interface SandboxedIframeProps {
  entryPoint: string;
}

function SandboxedIframe({ entryPoint }: SandboxedIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();

  const isOriginTrusted = useCallback(
    (origin: string): boolean => {
      try {
        const pluginUrl = new URL(entryPoint);
        const messageOrigin = new URL(origin);
        return pluginUrl.host === messageOrigin.host;
      } catch {
        return false;
      }
    },
    [entryPoint],
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isOriginTrusted(event.origin)) {
        console.warn(
          `[PluginRenderer] Rejected message from untrusted origin: ${event.origin} (expected host from ${entryPoint})`,
        );
        return;
      }

      const data = event.data as PluginMessage;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "farm:navigate") {
        router.push(data.path);
        return;
      }

      if (data.type === "farm:toast") {
        const variant = data.variant ?? "info";
        if (variant === "success") toast.success(data.message);
        else if (variant === "error") toast.error(data.message);
        else toast(data.message);
        return;
      }

      if (data.type === "farm:api-request") {
        const token = getAccessToken();
        fetch(data.url, {
          method: data.method ?? "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: data.body != null ? JSON.stringify(data.body) : undefined,
        })
          .then((res) => res.json())
          .then((responseData) => {
            iframeRef.current?.contentWindow?.postMessage(
              { type: "farm:api-response", requestId: data.requestId, data: responseData },
              new URL(entryPoint).origin,
            );
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            iframeRef.current?.contentWindow?.postMessage(
              {
                type: "farm:api-response",
                requestId: data.requestId,
                error: message,
              },
              new URL(entryPoint).origin,
            );
          });
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [entryPoint, isOriginTrusted, router]);

  return (
    <iframe
      ref={iframeRef}
      src={entryPoint}
      sandbox="allow-scripts allow-same-origin"
      className="w-full h-full min-h-[400px] border-0"
      title="Plugin"
    />
  );
}

// ── PluginRenderer ────────────────────────────────────────────────────────────

/**
 * Renders a Farm plugin either as a lazily-loaded React component (route mode)
 * or as a sandboxed iframe with a postMessage bridge (iframe mode).
 */
export function PluginRenderer({
  entryPoint,
  mode,
  componentProps,
  loader,
}: PluginRendererProps) {
  if (mode === "iframe") {
    return <SandboxedIframe entryPoint={entryPoint} />;
  }

  return (
    <LazyPlugin
      entryPoint={entryPoint}
      componentProps={componentProps}
      loader={loader}
    />
  );
}
