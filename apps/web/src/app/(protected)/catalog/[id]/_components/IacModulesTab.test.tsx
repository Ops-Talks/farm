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
        screen.getByText(/No IaC modules found/i),
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

  it("closes link dialog when Cancel is clicked", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    mockListModules.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/link module/i));
    await user.click(screen.getAllByRole("button", { name: /link module/i })[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument(),
    );
  });

  it("selects module in dialog and calls linkComponent on Link click", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    mockListModules.mockResolvedValue([
      buildModule({ id: "mod-2", name: "terraform-aws-s3", componentId: null }),
    ]);
    mockLinkComponent.mockResolvedValue(
      buildModule({ id: "mod-2", componentId: "comp-1" }),
    );
    const user = userEvent.setup();
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/link module/i));
    await user.click(screen.getAllByRole("button", { name: /link module/i })[0]);
    await waitFor(() =>
      expect(screen.getByText("terraform-aws-s3")).toBeInTheDocument(),
    );
    await user.click(screen.getByText("terraform-aws-s3"));
    const linkBtn = screen
      .getAllByRole("button", { name: /^link$/i })
      .find((b) => !b.hasAttribute("disabled"));
    if (linkBtn) await user.click(linkBtn);
    expect(mockLinkComponent).toHaveBeenCalledWith("mod-2", "comp-1");
  });

  it("renders module description when present", async () => {
    mockGetComponentModules.mockResolvedValue([
      buildModule({ description: "Provisions a VPC with subnets" }),
    ]);
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(
        screen.getByText("Provisions a VPC with subnets"),
      ).toBeInTheDocument();
    });
  });

  it("empty state secondary link button opens dialog", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    mockListModules.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/link a module/i));
    await user.click(screen.getByRole("button", { name: /link a module/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument(),
    );
  });

  it("typing in search box calls list with the search term", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    mockListModules.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/No IaC modules found/i));
    await user.click(screen.getByRole("button", { name: /link a module/i }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/search modules/i)).toBeInTheDocument(),
    );
    await user.type(screen.getByPlaceholderText(/search modules/i), "vpc");
    await waitFor(() => {
      expect(mockListModules).toHaveBeenCalledWith({ search: "vpc" });
    });
  });

  it("shows skeleton inside dialog while available modules are loading", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    mockListModules.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(
      <IacModulesTab component={buildComponent()} />,
      { wrapper: createWrapper() },
    );
    await waitFor(() => screen.getByText(/No IaC modules found/i));
    await user.click(screen.getByRole("button", { name: /link a module/i }));
    // The dialog mounts in a portal (document.body), so query the full body for skeletons
    await waitFor(() => {
      expect(
        document.body.querySelectorAll("[data-slot='skeleton']").length,
      ).toBeGreaterThan(0);
    });
  });

  it("shows 'No modules found.' text in dialog when available list is empty", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    mockListModules.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/No IaC modules found/i));
    await user.click(screen.getByRole("button", { name: /link a module/i }));
    await waitFor(() =>
      expect(screen.getByText("No modules found.")).toBeInTheDocument(),
    );
  });

  it("Link button in dialog is disabled when no module is selected", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    mockListModules.mockResolvedValue([
      buildModule({ id: "mod-2", name: "terraform-aws-s3", componentId: null }),
    ]);
    const user = userEvent.setup();
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/No IaC modules found/i));
    await user.click(screen.getByRole("button", { name: /link a module/i }));
    await waitFor(() => screen.getByText("terraform-aws-s3"));
    const linkBtn = screen.getByRole("button", { name: /^link$/i });
    expect(linkBtn).toBeDisabled();
  });

  it("does not render version badge in dialog list when module latestVersion is null", async () => {
    mockGetComponentModules.mockResolvedValue([]);
    mockListModules.mockResolvedValue([
      buildModule({
        id: "mod-2",
        name: "terraform-aws-s3",
        componentId: null,
        latestVersion: null,
      }),
    ]);
    const user = userEvent.setup();
    render(<IacModulesTab component={buildComponent()} />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByText(/No IaC modules found/i));
    await user.click(screen.getByRole("button", { name: /link a module/i }));
    await waitFor(() => screen.getByText("terraform-aws-s3"));
    expect(screen.getByText("terraform-aws-s3")).toBeInTheDocument();
    // latestVersion is null so no version badge ("v3.19.0") should appear
    expect(screen.queryByText("v3.19.0")).not.toBeInTheDocument();
  });
});
