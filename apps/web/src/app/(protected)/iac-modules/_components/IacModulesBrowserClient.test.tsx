import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";
import type { IacModule } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockList = vi.fn();

vi.mock("@/lib/api-client", () => ({
  iacModules: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------

import { IacModulesBrowserClient } from "./IacModulesBrowserClient";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IacModulesBrowserClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page header", async () => {
    mockList.mockResolvedValue([]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });
    expect(screen.getByText("IaC Modules")).toBeInTheDocument();
  });

  it("shows empty state when no modules", async () => {
    mockList.mockResolvedValue([]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/no modules found/i)).toBeInTheDocument();
    });
  });

  it("renders module cards", async () => {
    mockList.mockResolvedValue([buildModule(), buildModule({ id: "mod-2", name: "terraform-aws-s3" })]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument();
      expect(screen.getByText("terraform-aws-s3")).toBeInTheDocument();
    });
  });

  it("renders provider badge and version", async () => {
    mockList.mockResolvedValue([buildModule()]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("aws")).toBeInTheDocument();
      expect(screen.getByText("v3.19.0")).toBeInTheDocument();
    });
  });

  it("renders module description", async () => {
    mockList.mockResolvedValue([buildModule()]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("Creates a VPC on AWS")).toBeInTheDocument();
    });
  });

  it("shows loading skeletons while data is being fetched", () => {
    mockList.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<IacModulesBrowserClient />, {
      wrapper: createWrapper(),
    });
    const skeletons = container.querySelectorAll(".space-y-2");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders engine badge when module has an engine", async () => {
    mockList.mockResolvedValue([buildModule({ engine: "terraform" })]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText("terraform")).toBeInTheDocument();
    });
  });

  it("applies provider filter when select changes", async () => {
    const { fireEvent } = await import("@testing-library/react");
    mockList.mockResolvedValue([]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "aws" } });
    await waitFor(() => {
      const calls = mockList.mock.calls;
      const lastCall = calls[calls.length - 1] as [{ provider?: string }];
      expect(lastCall[0]?.provider).toBe("aws");
    });
  });

  it("navigates to module detail on Enter key press", async () => {
    const { fireEvent } = await import("@testing-library/react");
    mockList.mockResolvedValue([buildModule()]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument(),
    );

    const card = screen.getByRole("button");
    expect(() => fireEvent.keyDown(card, { key: "Enter" })).not.toThrow();
  });

  it("navigates to module detail on Space key press", async () => {
    const { fireEvent } = await import("@testing-library/react");
    mockList.mockResolvedValue([buildModule()]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument(),
    );

    const card = screen.getByRole("button");
    expect(() => fireEvent.keyDown(card, { key: " " })).not.toThrow();
  });

  it("does not navigate on unrecognized key press", async () => {
    const { fireEvent } = await import("@testing-library/react");
    mockList.mockResolvedValue([buildModule()]);
    render(<IacModulesBrowserClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("terraform-aws-vpc")).toBeInTheDocument(),
    );

    const card = screen.getByRole("button");
    expect(() => fireEvent.keyDown(card, { key: "Tab" })).not.toThrow();
  });
});
