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
import { organizations as orgsApi } from "@/lib/api-client";

const STORAGE_KEY = "farm_current_org";

interface OrganizationContextValue {
  /** All organizations the current user belongs to */
  organizations: Organization[];
  /** The currently selected organization (null = none / personal) */
  currentOrg: Organization | null;
  /** True while the initial fetch is in-flight */
  isLoading: boolean;
  /** Switch the active organization */
  switchOrg: (org: Organization) => void;
  /** Re-fetch the list from the API (call after create / delete) */
  refreshOrgs: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [orgList, setOrgList] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    try {
      const raw = await orgsApi.list();
      // Guard against non-array responses (e.g. proxy error payloads)
      const list = Array.isArray(raw) ? raw : [];
      setOrgList(list);

      // Restore persisted selection from sessionStorage
      const savedId =
        typeof window !== "undefined"
          ? sessionStorage.getItem(STORAGE_KEY)
          : null;

      if (savedId) {
        const found = list.find((o) => o.id === savedId) ?? null;
        setCurrentOrg(found);
      } else if (list.length === 1) {
        // Auto-select when the user only belongs to one org
        const only = list[0];
        if (only) {
          setCurrentOrg(only);
          sessionStorage.setItem(STORAGE_KEY, only.id);
        }
      }
    } catch {
      // If the fetch fails (e.g. no token yet) keep the current state
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount — auth token should already be available since
  // OrganizationProvider is nested inside AuthProvider.
  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const switchOrg = useCallback((org: Organization) => {
    setCurrentOrg(org);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, org.id);
    }
  }, []);

  const refreshOrgs = useCallback(async () => {
    await fetchOrgs();
  }, [fetchOrgs]);

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations: orgList,
      currentOrg,
      isLoading,
      switchOrg,
      refreshOrgs,
    }),
    [orgList, currentOrg, isLoading, switchOrg, refreshOrgs],
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
