import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockMatrix = vi.fn();
vi.mock("@/lib/api-client", () => ({
  deployments: { matrix: (...args: unknown[]) => mockMatrix(...args) },
}));

vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
}));

vi.mock("@/types/api", () => ({
  ComponentKindGroup: { DEV: "dev", INFRA: "infra", DATA: "data", SECURITY: "security" },
  DeploymentStatus: {
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    ROLLED_BACK: "rolled_back",
  },
  FarmEvent: {
    DEPLOYMENT_CREATED: "deployment.created",
    DEPLOYMENT_UPDATED: "deployment.updated",
  },
}));

import DeploymentsPage from "@/app/(protected)/deployments/page";

const matrixRow = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "auth-service",
  kind: "service",
  environments: [
    { environmentId: "e1", environmentName: "staging", status: "succeeded", version: "1.2.3" },
    { environmentId: "e2", environmentName: "production", status: null, version: null },
  ],
  ...overrides,
});

describe("DeploymentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render heading and history link", async () => {
    mockMatrix.mockResolvedValue([]);
    render(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Deployment Matrix")).toBeInTheDocument();
    });
    expect(screen.getByText("Deployment History")).toBeInTheDocument();
  });

  it("should display matrix rows with component and environments", async () => {
    mockMatrix.mockResolvedValue([matrixRow()]);
    render(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("auth-service")).toBeInTheDocument();
    });
    expect(screen.getByText("staging")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("1.2.3")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("should show empty state", async () => {
    mockMatrix.mockResolvedValue([]);
    render(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No components found/)).toBeInTheDocument();
    });
  });

  it("should show component count and environment count", async () => {
    mockMatrix.mockResolvedValue([matrixRow(), matrixRow({ id: "c2", name: "payment-api" })]);
    render(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/2 components across 2 environments/)).toBeInTheDocument();
    });
  });

  it("should render status legend", async () => {
    mockMatrix.mockResolvedValue([]);
    render(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Status:")).toBeInTheDocument();
    });
    expect(screen.getByText("Not deployed")).toBeInTheDocument();
  });

  it("should render kind group filter tabs", async () => {
    mockMatrix.mockResolvedValue([]);
    render(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.getByText("Infra")).toBeInTheDocument();
  });

  it("should handle API errors gracefully", async () => {
    mockMatrix.mockRejectedValue(new Error("fail"));
    render(<DeploymentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No components found/)).toBeInTheDocument();
    });
  });
});
