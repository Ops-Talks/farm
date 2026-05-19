"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Organization } from "@/types/api";
import { OrgRole } from "@farm/types";
import { organizations as orgsApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

/** Shared key used to persist the selected org id in sessionStorage. */
export const ORG_STORAGE_KEY = "farm_current_org";

interface OrganizationContextValue {
  /** All organizations the current user belongs to */
  organizations: Organization[];
  /** The currently selected organization (null = none / personal) */
  currentOrg: Organization | null;
  /**
   * The current user's role in the selected organization.
   * Null while loading or when no organization is selected.
   */
  orgRole: OrgRole | null;
  /** True while the initial fetch is in-flight */
  isLoading: boolean;
  /** Switch the active organization */
  switchOrg: (org: Organization) => void;
  /** Re-fetch the list from the API (call after create / delete) */
  refreshOrgs: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [orgList, setOrgList] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [orgRole, setOrgRole] = useState<OrgRole | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  // hasFetchedForCurrentAuth starts false and is reset on logout so that the
  // derived isLoading is true in the same render where isAuthenticated becomes
  // true, preventing OrgReadyGate from firing its redirect effect before the
  // org fetch has had a chance to complete.
  const [hasFetchedForCurrentAuth, setHasFetchedForCurrentAuth] =
    useState(false);

  // isLoading is true whenever we know a fetch is pending for the current auth
  // session: either we are currently fetching, or the user is authenticated but
  // we have not yet completed a fetch for this session.
  const isLoading = isFetching || (isAuthenticated && !hasFetchedForCurrentAuth);

  const fetchOrgs = useCallback(async () => {
    setIsFetching(true);
    try {
      const raw = await orgsApi.list();
      // Guard against non-array responses (e.g. proxy error payloads)
      const list = Array.isArray(raw) ? raw : [];
      setOrgList(list);

      // Restore persisted selection from sessionStorage
      const savedId =
        typeof window !== "undefined"
          ? sessionStorage.getItem(ORG_STORAGE_KEY)
          : null;

      let resolvedOrg: Organization | null = null;

      if (savedId) {
        const found = list.find((o) => o.id === savedId) ?? null;
        if (found) {
          resolvedOrg = found;
          setCurrentOrg(found);
        } else {
          // Stale org ID — user is no longer a member of that org.
          // Fall back to first available org so the user is not left with no context.
          sessionStorage.removeItem(ORG_STORAGE_KEY);
          const fallback = list[0] ?? null;
          resolvedOrg = fallback;
          setCurrentOrg(fallback);
          if (fallback) {
            sessionStorage.setItem(ORG_STORAGE_KEY, fallback.id);
          }
        }
      } else {
        if (list.length > 0) {
          // Auto-select first org when user has no saved selection.
          // Works for single-org AND multi-org users.
          const first = list[0];
          if (first) {
            resolvedOrg = first;
            setCurrentOrg(first);
            sessionStorage.setItem(ORG_STORAGE_KEY, first.id);
          }
        } else {
          setCurrentOrg(null);
        }
      }

      // Role for resolvedOrg will be fetched by the useEffect([currentOrg])
      // below, which fires whenever currentOrg changes. Avoid fetching here
      // to prevent duplicate members.me() requests on initial load.
      if (!resolvedOrg) {
        setOrgRole(null);
      }
    } catch {
      // If the fetch fails (e.g. no token yet) keep the current state
    } finally {
      setIsFetching(false);
      // Mark that at least one fetch attempt was made for this auth session so
      // that the derived isLoading clears and OrgReadyGate can decide whether
      // to render children or redirect.
      setHasFetchedForCurrentAuth(true);
    }
  }, []);

  // Re-fetch whenever auth state changes. On login isAuthenticated flips to
  // true and we need a fresh org list before any protected page can render.
  // On logout we clear state immediately so stale data is never shown.
  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchOrgs();
    } else {
      setOrgList([]);
      setCurrentOrg(null);
      setOrgRole(null);
      // Reset so the next login triggers isLoading=true immediately in the
      // render where isAuthenticated becomes true (before any effects fire).
      setHasFetchedForCurrentAuth(false);
    }
  }, [isAuthenticated, fetchOrgs]);

  // When the selected org changes (via switchOrg), re-fetch the membership
  // role for the new org without refetching the full org list.
  useEffect(() => {
    let cancelled = false;
    const fetchRole = async () => {
      if (!currentOrg) {
        setOrgRole(null);
        return;
      }
      try {
        const membership = await orgsApi.members.me(currentOrg.id);
        if (!cancelled) {
          setOrgRole(membership.role as OrgRole);
        }
      } catch {
        if (!cancelled) {
          setOrgRole(null);
        }
      }
    };
    void fetchRole();
    return () => {
      cancelled = true;
    };
  }, [currentOrg]);

  // When api-client clears a stale org on 403, re-fetch so React state stays
  // in sync with sessionStorage. The event is dispatched by api-client to
  // avoid a circular import.
  useEffect(() => {
    function handleOrgStale() {
      void fetchOrgs();
    }
    window.addEventListener("farm:org:stale", handleOrgStale);
    return () => {
      window.removeEventListener("farm:org:stale", handleOrgStale);
    };
  }, [fetchOrgs]);

  const switchOrg = useCallback((org: Organization) => {
    setCurrentOrg(org);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ORG_STORAGE_KEY, org.id);
    }
  }, []);

  const refreshOrgs = useCallback(async () => {
    await fetchOrgs();
  }, [fetchOrgs]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations: orgList,
      currentOrg,
      orgRole,
      isLoading,
      switchOrg,
      refreshOrgs,
    }),
    [orgList, currentOrg, orgRole, isLoading, switchOrg, refreshOrgs],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider",
    );
  }
  return context;
}
