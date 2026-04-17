import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";
import type { IacModule, IacModuleVersion } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetModule = vi.fn();
const mockGetVersions = vi.fn();
const mockSync = vi.fn();

vi.mock("@/lib/api-client", () => ({
  iacModules: {
    get: (...args: unknown[]) => mockGetModule(...args),
    getVersions: (...args: unknown[]) => mockGetVersions(...args),
    sync: (...args: unknown[]) => mockSync(...args),
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "mod-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title, description, children }: { title: string; description?: string; children?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { IacModuleDetailClient } from "./IacModuleDetailClient";

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

function buildModule(overrides: Partial<IacModule> = {}): IacModule {
  return {
    id: "mod-1",
    name: "terraform-aws-vpc",
    provider: "aws",
    engine: null,
    sourceRepoUrl: "https://github.com/terraform-aws-modules/terraform-aws-vpc",
    description: "Creates a VPC on AWS",
    latestVersion: "v3.19.0",
    componentId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function buildVersion(overrides: Partial<IacModuleVersion> = {}): IacModuleVersion {
  return {
    id: "ver-1",
    version: "v3.19.0",
    isLatest: true,
    variablesMeta: [
      {
        name: "region",
        type: "string",
        description: "AWS region",
        default: "us-east-1",
        required: false,
        validation: null,
      },
    ],
    outputsMeta: [
      {
        name: "vpc_id",
        description: "The VPC ID",
        value: null,
      },
    ],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IacModuleDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows skeleton while loading", () => {
    mockGetModule.mockReturnValue(new Promise(() => {}));
    mockGetVersions.mockResolvedValue([]);
    const { container } = render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
  });

  it("renders module name and provider", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument();
    });
    expect(screen.getByText("aws")).toBeInTheDocument();
  });

  it("renders variables table from version", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([buildVersion()]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("region")).toBeInTheDocument();
    });
    expect(screen.getByText("AWS region")).toBeInTheDocument();
  });

  it("renders outputs table from version", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([buildVersion()]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("vpc_id")).toBeInTheDocument();
    });
    expect(screen.getByText("The VPC ID")).toBeInTheDocument();
  });

  it("shows empty versions message when no versions", async () => {
    mockGetModule.mockResolvedValue(buildModule({ latestVersion: null }));
    mockGetVersions.mockResolvedValue([]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/no versions synced yet/i)).toBeInTheDocument();
    });
  });

  it("shows not found message when module is null", async () => {
    mockGetModule.mockResolvedValue(null);
    mockGetVersions.mockResolvedValue([]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/module not found/i)).toBeInTheDocument();
    });
  });

  it("renders usage snippet", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([buildVersion()]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Usage")).toBeInTheDocument();
    });
  });

  it("renders required badge for required variable", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([
      buildVersion({
        variablesMeta: [
          {
            name: "account_id",
            type: "string",
            description: "AWS account ID",
            default: null,
            required: true,
            validation: null,
          },
        ],
      }),
    ]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("required")).toBeInTheDocument();
    });
  });

  it("renders dash for output with null description", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([
      buildVersion({
        outputsMeta: [{ name: "subnet_ids", description: null, value: null }],
      }),
    ]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("subnet_ids")).toBeInTheDocument();
    });
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("calls sync when Sync button is clicked", async () => {
    const { fireEvent } = await import("@testing-library/react");
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([]);
    mockSync.mockResolvedValue({ newVersions: 0, latestVersion: null });
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument(),
    );
    const syncButton = screen.getAllByRole("button").find((b) =>
      b.textContent?.toLowerCase().includes("sync"),
    );
    expect(syncButton).toBeTruthy();
    fireEvent.click(syncButton!);
    await waitFor(() => expect(mockSync).toHaveBeenCalled());
  });

  it("shows Copied! after copy button click", async () => {
    const { fireEvent } = await import("@testing-library/react");
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([buildVersion()]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() =>
      expect(screen.getByText("Copied!")).toBeInTheDocument(),
    );
  });

  it("changes selected version when version selector changes", async () => {
    const { fireEvent } = await import("@testing-library/react");
    mockGetModule.mockResolvedValue(buildModule());
    const v1 = buildVersion({ id: "ver-1", version: "v3.19.0", isLatest: true });
    const v2 = buildVersion({ id: "ver-2", version: "v3.18.0", isLatest: false });
    mockGetVersions.mockResolvedValue([v1, v2]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByDisplayValue("v3.19.0 (latest)")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "ver-2" },
    });
    await waitFor(() =>
      expect(screen.getByDisplayValue("v3.18.0")).toBeInTheDocument(),
    );
  });

  it("back button click in main view does not throw", async () => {
    const { fireEvent } = await import("@testing-library/react");
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument(),
    );
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: /iac modules/i })),
    ).not.toThrow();
  });

  it("back to modules button click in not-found view does not throw", async () => {
    const { fireEvent } = await import("@testing-library/react");
    mockGetModule.mockResolvedValue(null);
    mockGetVersions.mockResolvedValue([]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /back to modules/i }),
      ).toBeInTheDocument(),
    );
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: /back to modules/i })),
    ).not.toThrow();
  });

  it("renders 'No variables' message when version has empty variablesMeta", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([buildVersion({ variablesMeta: [] })]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(
        screen.getByText(/no variables declared in this version/i),
      ).toBeInTheDocument();
    });
  });

  it("renders 'any' when variable type is null", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([
      buildVersion({
        variablesMeta: [
          { name: "region", type: null, description: "AWS region", default: null, required: false, validation: null },
        ],
      }),
    ]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("region")).toBeInTheDocument();
    });
    expect(screen.getByText("any")).toBeInTheDocument();
  });

  it("renders dash placeholder when variable description is null", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([
      buildVersion({
        variablesMeta: [
          { name: "region", type: "string", description: null, default: null, required: false, validation: null },
        ],
      }),
    ]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("region")).toBeInTheDocument();
    });
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders 'No outputs' message when version has empty outputsMeta", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([buildVersion({ outputsMeta: [] })]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(
        screen.getByText(/no outputs declared in this version/i),
      ).toBeInTheDocument();
    });
  });

  it("does not render description paragraph when module description is null", async () => {
    mockGetModule.mockResolvedValue(buildModule({ description: null }));
    mockGetVersions.mockResolvedValue([]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument();
    });
    expect(screen.queryByText("Creates a VPC on AWS")).not.toBeInTheDocument();
  });

  it("disables Sync button while mutation is pending", async () => {
    const { fireEvent } = await import("@testing-library/react");
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([]);
    mockSync.mockReturnValue(new Promise(() => {}));
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument(),
    );
    const syncBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.toLowerCase().includes("sync"))!;
    fireEvent.click(syncBtn);
    await waitFor(() => expect(syncBtn).toBeDisabled());
  });

  it("renders version option without (latest) suffix when isLatest is false", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockResolvedValue([
      buildVersion({ id: "ver-only", version: "v1.0.0", isLatest: false }),
    ]);
    render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByDisplayValue("v1.0.0")).toBeInTheDocument();
    });
    expect(screen.queryByText(/\(latest\)/i)).not.toBeInTheDocument();
  });

  it("shows inner skeleton while versions are loading after module resolves", async () => {
    mockGetModule.mockResolvedValue(buildModule());
    mockGetVersions.mockReturnValue(new Promise(() => {}));
    const { container } = render(<IacModuleDetailClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument(),
    );
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
  });
});
