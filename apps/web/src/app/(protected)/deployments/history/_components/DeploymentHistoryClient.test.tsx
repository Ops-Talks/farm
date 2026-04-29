import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockListDeployments = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/api-client", () => ({
  deployments: {
    list: (...args: unknown[]) => mockListDeployments(...args),
  },
}));

vi.mock("@/types/api", () => ({
  DeploymentStatus: {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    ROLLED_BACK: "rolled_back",
  },
}));

import { DeploymentHistoryClient } from "@/app/(protected)/deployments/history/_components/DeploymentHistoryClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeDeployment = (overrides: Record<string, unknown> = {}) => ({
  id: "dep-1",
  componentId: "comp-1",
  environmentId: "env-1",
  version: "v1.0.0",
  status: "succeeded",
  deployedBy: "admin",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  component: { id: "comp-1", name: "auth-service" },
  environment: { id: "env-1", name: "production" },
  ...overrides,
});

const makePaginated = <T,>(data: T[], total?: number) => ({
  data,
  total: total ?? data.length,
  skip: 0,
  take: 20,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("DeploymentHistoryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Deployment History' heading", async () => {
    mockListDeployments.mockResolvedValue(makePaginated([]));
    render(<DeploymentHistoryClient />);

    await waitFor(() => {
      expect(screen.getByText("Deployment History")).toBeInTheDocument();
    });
  });

  it("renders status filter buttons", async () => {
    mockListDeployments.mockResolvedValue(makePaginated([]));
    render(<DeploymentHistoryClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Succeeded" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Failed" })).toBeInTheDocument();
  });

  it("shows loading skeletons initially", () => {
    mockListDeployments.mockReturnValue(new Promise(() => {}));
    render(<DeploymentHistoryClient />);
    // The table renders skeleton rows — check for role rows
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("shows empty state when no deployments found", async () => {
    mockListDeployments.mockResolvedValue(makePaginated([]));
    render(<DeploymentHistoryClient />);

    await waitFor(() => {
      expect(screen.getByText("No deployments found")).toBeInTheDocument();
    });
  });

  it("renders deployment rows in the table", async () => {
    mockListDeployments.mockResolvedValue(makePaginated([makeDeployment()]));
    render(<DeploymentHistoryClient />);

    await waitFor(() => {
      expect(screen.getByText("auth-service")).toBeInTheDocument();
    });
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
  });

  it("renders Matrix View link", async () => {
    mockListDeployments.mockResolvedValue(makePaginated([]));
    render(<DeploymentHistoryClient />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Matrix View" })).toBeInTheDocument();
    });
  });

  it("shows deployment count", async () => {
    mockListDeployments.mockResolvedValue(makePaginated([makeDeployment()], 1));
    render(<DeploymentHistoryClient />);

    await waitFor(() => {
      expect(screen.getByText("1 deployment recorded")).toBeInTheDocument();
    });
  });

  it("re-fetches with status filter when filter button is clicked", async () => {
    const user = userEvent.setup();
    mockListDeployments.mockResolvedValue(makePaginated([]));
    render(<DeploymentHistoryClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Failed" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Failed" }));

    await waitFor(() => {
      expect(mockListDeployments).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" }),
      );
    });
  });
});
