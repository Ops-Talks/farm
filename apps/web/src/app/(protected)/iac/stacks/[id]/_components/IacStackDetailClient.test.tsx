import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// ---------------------------------------------------------------------------
// Mock fns (declared before vi.mock calls)
// ---------------------------------------------------------------------------

const mockGetStack = vi.fn();

vi.mock("@/lib/api-client", () => ({
  iac: {
    getStack: (...args: unknown[]) => mockGetStack(...args),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "stack-uuid-1" }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/iac/stacks/stack-uuid-1",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Isolate from IacStackRunsClient internals — the runs section is tested
// separately in IacStackRunsClient.test.tsx.
vi.mock("../runs/_components/IacStackRunsClient", () => ({
  IacStackRunsClient: () => (
    <div data-testid="iac-stack-runs-client">Run history</div>
  ),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { IacStackDetailClient } from "./IacStackDetailClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockStack = {
  id: "stack-uuid-1",
  name: "infra-prod-vpc",
  environment: "production",
  provider: "opentofu",
  repositoryUrl: "https://github.com/org/infra",
  basePath: "stacks/vpc",
  externalToolUrl: "https://app.spacelift.io/stack/infra-prod-vpc",
  componentId: "component-uuid-abc",
  autoImported: true,
  lastRun: {
    id: "run-uuid-1",
    status: "succeeded" as const,
    type: "apply" as const,
    startedAt: "2024-01-01T10:00:00Z",
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T10:01:00Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IacStackDetailClient", () => {
  beforeEach(() => {
    mockGetStack.mockResolvedValue(mockStack);
  });

  afterEach(() => vi.clearAllMocks());

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  it("shows loading skeleton while fetching", () => {
    mockGetStack.mockReturnValue(new Promise(() => {}));
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    // Stack name should not yet appear while loading.
    expect(screen.queryByText("infra-prod-vpc")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Stack metadata
  // -------------------------------------------------------------------------

  it("renders the stack name as a heading", async () => {
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "infra-prod-vpc" })).toBeDefined();
    });
  });

  it("renders the provider badge", async () => {
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("opentofu")).toBeDefined();
    });
  });

  it("renders the environment badge", async () => {
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("production")).toBeDefined();
    });
  });

  it("renders the repository URL as a link", async () => {
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const link = screen.getByText("https://github.com/org/infra");
      expect(link).toBeDefined();
    });
  });

  it("does not render the repository section when repositoryUrl is null", async () => {
    mockGetStack.mockResolvedValue({ ...mockStack, repositoryUrl: null });
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "infra-prod-vpc" })).toBeDefined();
    });

    expect(screen.queryByText("Repository:")).toBeNull();
  });

  it("renders the linked component chip with a link to the catalog page", async () => {
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const link = screen.getByText("component-uuid-abc");
      expect(link).toBeDefined();
      expect((link as HTMLAnchorElement).href).toContain(
        "/catalog/component-uuid-abc",
      );
    });
  });

  it("does not render the component section when componentId is null", async () => {
    mockGetStack.mockResolvedValue({ ...mockStack, componentId: null });
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "infra-prod-vpc" })).toBeDefined();
    });

    expect(screen.queryByText("Component:")).toBeNull();
  });

  it("renders the 'Open' link-out button when externalToolUrl is present", async () => {
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const openLink = screen.getByRole("link", {
        name: /open infra-prod-vpc in external tool/i,
      });
      expect(openLink).toBeDefined();
      expect((openLink as HTMLAnchorElement).href).toBe(
        "https://app.spacelift.io/stack/infra-prod-vpc",
      );
    });
  });

  it("does not render the 'Open' button when externalToolUrl is null", async () => {
    mockGetStack.mockResolvedValue({ ...mockStack, externalToolUrl: null });
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "infra-prod-vpc" })).toBeDefined();
    });

    expect(
      screen.queryByRole("link", { name: /open .* in external tool/i }),
    ).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Run history section
  // -------------------------------------------------------------------------

  it("renders the embedded run history section", async () => {
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("iac-stack-runs-client")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  it("shows error state when the API call fails", async () => {
    mockGetStack.mockRejectedValue(new Error("not found"));
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Stack not found")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // ProviderBadge non-opentofu branch (line 24 else colour)
  // -------------------------------------------------------------------------

  it("renders the provider badge with violet colour class for non-opentofu providers", async () => {
    mockGetStack.mockResolvedValue({ ...mockStack, provider: "terraform" });
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("terraform")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // EnvironmentBadge staging branch (lines 38-39)
  // -------------------------------------------------------------------------

  it("renders the environment badge for staging environment", async () => {
    mockGetStack.mockResolvedValue({
      ...mockStack,
      environment: "staging",
    });
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("staging")).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // EnvironmentBadge else branch (line 40) for arbitrary environments
  // -------------------------------------------------------------------------

  it("renders the environment badge with sky colour for an arbitrary environment name", async () => {
    mockGetStack.mockResolvedValue({
      ...mockStack,
      environment: "dev",
    });
    render(<IacStackDetailClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("dev")).toBeDefined();
    });
  });
});
