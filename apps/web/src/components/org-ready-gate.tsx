"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useOrganization } from "@/contexts/organization-context";
import { AppLoadingFallback } from "@/components/shared/app-loading-fallback";

/**
 * OrgReadyGate — blocks rendering of protected page children until BOTH the
 * AuthProvider has finished restoring the session AND the OrganizationProvider
 * has resolved the current user's org list.
 *
 * Without this gate:
 *  - On hard refresh: auth restoration is async; the org effect fires with
 *    isAuthenticated=false, clears org state, and sets isLoading=false before
 *    auth finishes — the gate opens with an empty org list.
 *  - On login: page components mount before org auto-select completes, firing
 *    useQuery hooks without X-Organization-Id and receiving 403.
 *
 * Zero-org users are redirected to /organizations/new so they are not stranded
 * with 403 responses on every org-required endpoint.
 *
 * Exception: /organizations/* routes are never redirected — the list page
 * shows its own empty state and /organizations/new is the creation entry point.
 */
export function OrgReadyGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { isLoading: orgLoading, organizations } = useOrganization();

  const ready = !authLoading && !orgLoading;
  // Organization management pages handle zero-org state themselves.
  const isOrgRoute = pathname.startsWith("/organizations");

  useEffect(() => {
    if (ready && isAuthenticated && organizations.length === 0 && !isOrgRoute) {
      router.replace("/organizations/new");
    }
  }, [ready, isAuthenticated, organizations.length, router, isOrgRoute]);

  if (!ready) {
    return <AppLoadingFallback />;
  }

  // While the zero-org redirect is in flight, keep showing the fallback.
  // Org management routes are exempt so /organizations/new can render.
  if (isAuthenticated && organizations.length === 0 && !isOrgRoute) {
    return <AppLoadingFallback />;
  }

  return <>{children}</>;
}
