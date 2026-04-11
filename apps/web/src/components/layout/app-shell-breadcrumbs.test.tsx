import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Override the global setup.ts mock with a multi-segment pathname
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/organizations/org-1/settings",
  useParams: () => ({ id: "org-1" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "admin", displayName: "Admin User", email: "admin@farm.dev", roles: ["admin"] },
    logout: vi.fn(),
    isAuthenticated: true,
  }),
}));

vi.mock("@/contexts/organization-context", () => ({
  useOrganization: () => ({
    organizations: [],
    currentOrg: null,
    isLoading: false,
    switchOrg: vi.fn(),
    refreshOrgs: vi.fn(),
  }),
  OrganizationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/otel-spans", () => ({
  recordSpan: vi.fn((_name: unknown, fn: () => unknown) => fn()),
  startSpan: vi.fn(() => ({ setAttribute: vi.fn(), end: vi.fn() })),
}));

vi.mock("@/lib/otel-context", () => ({
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
  getUserContext: vi.fn(() => null),
}));

// FeatureAvailabilityProvider uses useQuery — mock to avoid needing QueryClientProvider.
vi.mock("@/contexts/feature-availability-context", () => ({
  FeatureAvailabilityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFeatureAvailability: () => ({
    kubernetes: false, cost: false, registry: false, helm: false, istio: false,
    allConfigured: false, isLoading: false,
  }),
}));

// SearchModal uses useQuery — stub it out.
vi.mock("@/components/search/search-modal", () => ({
  SearchModal: () => null,
}));

import { AppShell } from "@/components/layout/app-shell";

describe("AppShell — breadcrumbs", () => {
  it("renders breadcrumb navigation for a multi-segment path", () => {
    render(<AppShell>Content</AppShell>);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });

  it("renders capitalized segment labels in breadcrumbs", () => {
    render(<AppShell>Content</AppShell>);
    const breadcrumbNav = screen.getByRole("navigation", { name: "Breadcrumb" });
    // "organizations" → "Organizations" and "settings" → "Settings"
    expect(breadcrumbNav).toHaveTextContent("Organizations");
    expect(breadcrumbNav).toHaveTextContent("Settings");
  });

  it("renders intermediate path segments as links", () => {
    render(<AppShell>Content</AppShell>);
    const breadcrumbNav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const orgLinks = Array.from(breadcrumbNav.querySelectorAll("a")).filter(
      (a) => a.textContent === "Organizations",
    );
    expect(orgLinks.length).toBeGreaterThan(0);
    expect(orgLinks[0]).toHaveAttribute("href", "/organizations");
  });

  it("renders the last path segment as plain text, not a link", () => {
    render(<AppShell>Content</AppShell>);
    // "Settings" (last breadcrumb segment) is a <span>, not a link.
    // Scope to the breadcrumb nav to avoid matching the sidebar section label.
    const breadcrumbNav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const settingsSpans = Array.from(breadcrumbNav.querySelectorAll("span")).filter(
      (el) => el.textContent === "Settings",
    );
    expect(settingsSpans.length).toBeGreaterThan(0);
    settingsSpans.forEach((el) => expect(el.tagName).not.toBe("A"));
  });
});
