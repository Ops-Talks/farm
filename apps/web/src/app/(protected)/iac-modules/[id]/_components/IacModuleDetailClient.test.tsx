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
});
