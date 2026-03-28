"use client";

// GatewayRoutesTab — displays routes synchronized from API gateways (Kong, AWS)
// and per-route health check results. FARM-E48.

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { gateway } from "@/lib/api-client";
import type { ApiHealthCheck, GatewayRoute, RouteHealthStatus } from "@/types/api";

// ---------------------------------------------------------------------------
// HealthBadge — colored badge based on RouteHealthStatus
// ---------------------------------------------------------------------------

interface HealthBadgeProps {
  status: RouteHealthStatus | undefined;
}

function HealthBadge({ status }: HealthBadgeProps) {
  if (status === "up") {
    return (
      <Badge
        variant="outline"
        className="border-green-500 text-green-700 dark:text-green-400"
        data-testid="health-badge-up"
      >
        Up
      </Badge>
    );
  }
  if (status === "degraded") {
    return (
      <Badge
        variant="outline"
        className="border-yellow-500 text-yellow-700 dark:text-yellow-400"
        data-testid="health-badge-degraded"
      >
        Degraded
      </Badge>
    );
  }
  if (status === "down") {
    return (
      <Badge variant="destructive" data-testid="health-badge-down">
        Down
      </Badge>
    );
  }
  // No matching health check found for this route
  return (
    <Badge
      variant="outline"
      className="border-gray-400 text-gray-500 dark:text-gray-400"
      data-testid="health-badge-unknown"
    >
      Unknown
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// GatewayBadge — colored badge based on gateway type
// ---------------------------------------------------------------------------

interface GatewayBadgeProps {
  type: "kong" | "aws";
}

function GatewayBadge({ type }: GatewayBadgeProps) {
  if (type === "kong") {
    return (
      <Badge
        variant="outline"
        className="border-indigo-500 text-indigo-700 dark:text-indigo-400"
        data-testid="gateway-badge-kong"
      >
        Kong
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-orange-500 text-orange-700 dark:text-orange-400"
      data-testid="gateway-badge-aws"
    >
      AWS
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — 3 placeholder rows while data is fetching
// ---------------------------------------------------------------------------

function GatewayRoutesSkeleton() {
  return (
    <div className="space-y-2 pt-2" data-testid="gateway-routes-skeleton">
      {[1, 2, 3].map((n) => (
        <Skeleton key={n} className="h-10 w-full rounded" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// ---------------------------------------------------------------------------
// Health resolution — best-effort match of health checks to route paths
// ---------------------------------------------------------------------------

function resolveRouteHealth(
  route: GatewayRoute,
  healthChecks: ApiHealthCheck[],
): RouteHealthStatus | undefined {
  if (healthChecks.length === 0) return undefined;
  // Match any health check whose URL starts with one of the route's paths
  const match = healthChecks.find((hc) =>
    route.paths.some((p) => hc.url.startsWith(p) || p.startsWith(hc.url)),
  );
  return match?.status;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GatewayRoutesTabProps {
  componentId: string;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// GatewayRoutesTab
// ---------------------------------------------------------------------------

export function GatewayRoutesTab({ componentId, isAdmin }: GatewayRoutesTabProps) {
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [healthChecks, setHealthChecks] = useState<ApiHealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);

  // Fetch routes and health checks in parallel
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [routesData, healthData] = await Promise.all([
        gateway.listRoutes(componentId),
        gateway.listHealth(),
      ]);
      setRoutes(routesData);
      setHealthChecks(healthData);
    } catch {
      setError("Failed to load gateway routes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [componentId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Trigger a manual route sync from the gateway source
  const handleSync = useCallback(async () => {
    setSyncLoading(true);
    try {
      await gateway.triggerSync();
      // Reload routes after sync
      await fetchData();
    } catch {
      setError("Failed to trigger route sync.");
    } finally {
      setSyncLoading(false);
    }
  }, [fetchData]);

  // Trigger an on-demand health check for all routes
  const handleHealthCheck = useCallback(async () => {
    setHealthCheckLoading(true);
    try {
      await gateway.triggerHealthCheck();
      // Reload health results after check
      const healthData = await gateway.listHealth();
      setHealthChecks(healthData);
    } catch {
      setError("Failed to trigger health check.");
    } finally {
      setHealthCheckLoading(false);
    }
  }, []);

  // ── Render: loading state ──────────────────────────────────────────────────
  if (loading) {
    return <GatewayRoutesSkeleton />;
  }

  // ── Render: error state ────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive"
        data-testid="gateway-routes-error"
      >
        {error}
      </div>
    );
  }

  // ── Render: empty state ────────────────────────────────────────────────────
  if (routes.length === 0) {
    return (
      <div className="space-y-4">
        {/* Admin action buttons — shown even when no routes exist */}
        {isAdmin && (
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncLoading}
              data-testid="sync-routes-button"
            >
              {syncLoading ? "Syncing…" : "Sync Routes"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHealthCheck}
              disabled={healthCheckLoading}
              data-testid="run-health-check-button"
            >
              {healthCheckLoading ? "Checking…" : "Run Health Check"}
            </Button>
          </div>
        )}
        <EmptyState
          title="No gateway routes"
          description="No routes have been synced from any API gateway for this component."
        />
      </div>
    );
  }

  // ── Render: routes table ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Admin action bar */}
      {isAdmin && (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncLoading}
            data-testid="sync-routes-button"
          >
            {syncLoading ? "Syncing…" : "Sync Routes"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleHealthCheck}
            disabled={healthCheckLoading}
            data-testid="run-health-check-button"
          >
            {healthCheckLoading ? "Checking…" : "Run Health Check"}
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Paths</TableHead>
              <TableHead>Methods</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Last Synced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => {
              const healthStatus = resolveRouteHealth(route, healthChecks);
              return (
                <TableRow key={route.id} data-testid={`route-row-${route.id}`}>
                  {/* Name */}
                  <TableCell className="font-medium whitespace-nowrap">
                    {route.name}
                  </TableCell>

                  {/* Gateway type badge */}
                  <TableCell>
                    <GatewayBadge type={route.gatewayType} />
                  </TableCell>

                  {/* Paths — rendered as inline code tags */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {route.paths.map((path) => (
                        <code
                          key={path}
                          className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
                        >
                          {path}
                        </code>
                      ))}
                    </div>
                  </TableCell>

                  {/* HTTP methods — rendered as inline code tags */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {route.methods.map((method) => (
                        <code
                          key={method}
                          className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono uppercase"
                        >
                          {method}
                        </code>
                      ))}
                    </div>
                  </TableCell>

                  {/* Tags — rendered as Badge list */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {route.tags.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      ) : (
                        route.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>

                  {/* Health badge */}
                  <TableCell>
                    <HealthBadge status={healthStatus} />
                  </TableCell>

                  {/* Last synced — relative time or dash */}
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {route.syncedAt ? relativeTime(route.syncedAt) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
