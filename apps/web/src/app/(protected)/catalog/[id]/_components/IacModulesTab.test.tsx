import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";
import type { CatalogComponent, IacModule } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetComponentModules = vi.fn();
const mockUnlinkComponent = vi.fn();
const mockListModules = vi.fn();
const mockLinkComponent = vi.fn();

vi.mock("@/lib/api-client", () => ({
  iacModules: {
    getComponentModules: (...args: unknown[]) => mockGetComponentModules(...args),
    unlinkComponent: (...args: unknown[]) => mockUnlinkComponent(...args),
    list: (...args: unknown[]) => mockListModules(...args),
    linkComponent: (...args: unknown[]) => mockLinkComponent(...args),
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { IacModulesTab } from "./IacModulesTab";

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

function buildComponent(overrides: Partial<CatalogComponent> = {}): CatalogComponent {
  return {
    id: "comp-1",
    name: "My Service",
    kind: "Service" as never,
    owner: "team-a",
    lifecycle: "production" as never,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function buildModule(overrides: Partial<IacModule> = {}): IacModule {
  return {
    id: "mod-1",
    name: "terraform-aws-vpc",
    provider: "aws",
    engine: null,
    sourceRepoUrl: "https://github.com/terraform-aws-modules/terraform-aws-vpc",
    description: "Creates a VPC on AWS",
    latestVersion: "v3.19.0",
    componentId: "comp-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IacModulesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton while loading", () => {
    mockGetComponentModules.mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <IacModulesTab component={buildComponent()} />,
      { wrapper: createWrapper() },
    );
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
  });

  it("shows empty state when no modules linked", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(
        screen.getByText(/no iac modules are linked/i),
      ).toBeInTheDocument();
    });
  });

  it("renders linked modules", async () => {
    mockGetComponentModules.mockResolvedValue([buildModule()]);
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument();
    });
    expect(screen.getByText("aws")).toBeInTheDocument();
    expect(screen.getByText("v3.19.0")).toBeInTheDocument();
  });

  it("calls unlink when unlink button clicked", async () => {
    mockGetComponentModules.mockResolvedValue([buildModule()]);
    mockUnlinkComponent.mockResolvedValue(buildModule({ componentId: null }));
    const user = userEvent.setup();
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByLabelText(/unlink module/i));
    await user.click(screen.getByLabelText(/unlink module/i));
    expect(mockUnlinkComponent).toHaveBeenCalledWith("mod-1");
  });

  it("opens link dialog and lists available modules", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    mockListModules.mockResolvedValue([
      buildModule({ id: "mod-2", name: "terraform-aws-s3", componentId: null }),
    ]);
    const user = userEvent.setup();
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/link module/i));
    await user.click(screen.getAllByRole("button", { name: /link module/i })[0]);
    await waitFor(() => {
      expect(screen.getByText("terraform-aws-s3")).toBeInTheDocument();
    });
  });
});
