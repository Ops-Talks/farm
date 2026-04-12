import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetComponent = vi.fn();
const mockListDeployments = vi.fn();
const mockPush = vi.fn();
const mockGetCostEstimate = vi.fn().mockResolvedValue(null);
const mockGetActualCost = vi.fn().mockResolvedValue(null);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/catalog/comp-1",
  useParams: () => ({ id: "comp-1" }),
  useSearchParams: () => new URLSearchParams(),
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

vi.mock("@/lib/api-client", () => ({
  catalog: {
    getComponent: (...args: unknown[]) => mockGetComponent(...args),
    getComponents: vi.fn().mockResolvedValue({ data: [] }),
  },
  deployments: {
    list: (...args: unknown[]) => mockListDeployments(...args),
  },
  registry: {
    listHarborReplications: vi.fn().mockResolvedValue([]),
  },
  finops: {
    getCostEstimate: (...args: unknown[]) => mockGetCostEstimate(...args),
    getActualCost: (...args: unknown[]) => mockGetActualCost(...args),
  },
  linkerd: {
    getStatus: vi.fn().mockResolvedValue({ installed: false, components: [] }),
  },
}));

vi.mock("@/lib/otel-spans", () => ({
  recordSpan: vi.fn((_name: unknown, fn: () => unknown) => fn()),
}));

// Stub out all the complex tab sub-components to keep tests fast
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/HelmChartCard",
  () => ({ HelmChartCard: () => <div data-testid="helm-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/CRDResourcesTab",
  () => ({ CRDResourcesTab: () => <div data-testid="crds-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/CICDTab",
  () => ({ CICDTab: () => <div data-testid="cicd-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/CloudResourcesTab",
  () => ({ CloudResourcesTab: () => <div data-testid="cloud-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/ViolationsTab",
  () => ({ ViolationsTab: () => <div data-testid="violations-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/KyvernoPolicyTab",
  () => ({ KyvernoPolicyTab: () => <div data-testid="kyverno-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/IstioTrafficTab",
  () => ({ IstioTrafficTab: () => <div data-testid="istio-traffic-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/IstioSecurityTab",
  () => ({ IstioSecurityTab: () => <div data-testid="istio-security-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/IstioCanaryTab",
  () => ({ IstioCanaryTab: () => <div data-testid="istio-canary-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/LinkerdTrafficTab",
  () => ({ LinkerdTrafficTab: () => <div data-testid="linkerd-traffic-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/LinkerdSecurityTab",
  () => ({ LinkerdSecurityTab: () => <div data-testid="linkerd-security-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/LinkerdServiceProfileTab",
  () => ({ LinkerdServiceProfileTab: () => <div data-testid="linkerd-profile-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/ApiSpecsTab",
  () => ({ ApiSpecsTab: () => <div data-testid="api-specs-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/GatewayRoutesTab",
  () => ({ GatewayRoutesTab: () => <div data-testid="gateway-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/OperatorsTab",
  () => ({ OperatorsTab: () => <div data-testid="operators-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/HarborReplicationTable",
  () => ({ HarborReplicationTable: () => <div data-testid="harbor-replication-table" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/FluxBindingCard",
  () => ({ FluxBindingCard: () => <div data-testid="flux-binding-card-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/KedaBindingCard",
  () => ({ KedaBindingCard: () => <div data-testid="keda-binding-card-stub" /> }),
);

vi.mock("@/components/finops/CostEstimateCard", () => ({
  CostEstimateCard: () => <div data-testid="cost-estimate-card-stub" />,
}));
vi.mock("@/components/finops/CostBudgetExceededBanner", () => ({
  CostBudgetExceededBanner: ({ onDismiss }: { onDismiss?: () => void }) => (
    <div data-testid="cost-budget-exceeded-banner-stub">
      <button onClick={onDismiss}>Dismiss banner</button>
    </div>
  ),
}));

import { ComponentDetailClient } from "@/app/(protected)/catalog/[id]/_components/ComponentDetailClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeComponent = (overrides: Record<string, unknown> = {}) => ({
  id: "comp-1",
  name: "auth-service",
  kind: "service",
  lifecycle: "production",
  description: "Authentication microservice",
  repositoryUrl: "https://github.com/example/auth-service",
  links: [],
  metadata: {},
  helmChart: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ComponentDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListDeployments.mockResolvedValue({ data: [], total: 0 });
    mockGetCostEstimate.mockResolvedValue(null);
    mockGetActualCost.mockResolvedValue(null);
  });

  it("renders skeleton while loading", () => {
    mockGetComponent.mockReturnValue(new Promise(() => {}));
    render(<ComponentDetailClient />);
    // No heading until data loads
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders 'Component Not Found' when fetch fails", async () => {
    mockGetComponent.mockRejectedValue(new Error("Not Found"));
    render(<ComponentDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Component Not Found")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Back to Catalog" }),
    ).toBeInTheDocument();
  });

  it("navigates to /catalog when 'Back to Catalog' is clicked", async () => {
    const user = userEvent.setup();
    mockGetComponent.mockRejectedValue(new Error("Not Found"));
    render(<ComponentDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Back to Catalog" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Back to Catalog" }));
    expect(mockPush).toHaveBeenCalledWith("/catalog");
  });

  it("renders the component name as the page heading", async () => {
    mockGetComponent.mockResolvedValue(makeComponent());
    render(<ComponentDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "auth-service" })).toBeInTheDocument();
    });
  });

  it("renders component description", async () => {
    mockGetComponent.mockResolvedValue(makeComponent());
    render(<ComponentDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Authentication microservice")).toBeInTheDocument();
    });
  });

  it("renders kind and lifecycle badges", async () => {
    mockGetComponent.mockResolvedValue(makeComponent());
    render(<ComponentDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("service")).toBeInTheDocument();
    });
    expect(screen.getByText("production")).toBeInTheDocument();
  });

  it("renders the repository section for components with a repository URL", async () => {
    mockGetComponent.mockResolvedValue(makeComponent());
    render(<ComponentDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Repository")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: /View on GitHub/ }),
    ).toBeInTheDocument();
  });

  it("renders all tab triggers", async () => {
    mockGetComponent.mockResolvedValue(makeComponent());
    render(<ComponentDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: "Helm" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "CI/CD" })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Repository provider detection tests (detectProvider function coverage)
  // ---------------------------------------------------------------------------
  describe("detectProvider function", () => {
    it("detects GitHub subdomain (e.g., gist.github.com)", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://gist.github.com/user/abc123" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View on GitHub/ })).toBeInTheDocument();
      });
    });

    it("detects GitLab main domain (gitlab.com)", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://gitlab.com/group/project" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View on GitLab/ })).toBeInTheDocument();
      });
    });

    it("detects GitLab subdomain (e.g., registry.gitlab.com)", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://registry.gitlab.com/group/project" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View on GitLab/ })).toBeInTheDocument();
      });
    });

    it("detects GitLab with exactly two hostname labels (e.g., gitlab.local)", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://gitlab.local/group/project" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View on GitLab/ })).toBeInTheDocument();
      });
    });

    it("rejects gitlab-like hostnames with more than two labels (e.g., gitlab.example.com)", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://gitlab.example.com/group/project" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        // gitlab.example.com has 3 labels, should NOT match GitLab
        expect(screen.getByRole("link", { name: /View Repository/ })).toBeInTheDocument();
      });
      expect(screen.queryByRole("link", { name: /View on GitLab/ })).not.toBeInTheDocument();
    });

    it("renders generic repository label for Bitbucket URLs", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://bitbucket.org/user/repo" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View Repository/ })).toBeInTheDocument();
      });
    });

    it("renders generic repository label for invalid URLs", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "not-a-valid-url" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View Repository/ })).toBeInTheDocument();
      });
    });

    it("renders generic repository label for file paths", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "/local/path/to/repo" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View Repository/ })).toBeInTheDocument();
      });
    });

    // Security tests: ensure substring matching doesn't match malicious URLs
    it("rejects malicious URL containing github.com as substring (not actual host)", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://malicious-github.com.attacker.com/repo" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View Repository/ })).toBeInTheDocument();
      });
      // Should NOT match GitHub since the hostname is "malicious-github.com.attacker.com"
      expect(screen.queryByRole("link", { name: /View on GitHub/ })).not.toBeInTheDocument();
    });

    it("rejects malicious URL containing gitlab.com as substring (not actual host)", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://fake-gitlab.com.attacker.com/repo" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View Repository/ })).toBeInTheDocument();
      });
      // Should NOT match GitLab since the hostname is "fake-gitlab.com.attacker.com"
      expect(screen.queryByRole("link", { name: /View on GitLab/ })).not.toBeInTheDocument();
    });

    it("rejects URL with github.com in path (not hostname)", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://attacker.com/github.com/fake/repo" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View Repository/ })).toBeInTheDocument();
      });
      expect(screen.queryByRole("link", { name: /View on GitHub/ })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // HarborReplicationTable integration tests
  // ---------------------------------------------------------------------------
  describe("HarborReplicationTable integration", () => {
    it("renders HarborReplicationTable when registry is harbor", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({
          containerImage: { registry: "harbor", image: "myorg/myapp" },
        }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByTestId("harbor-replication-table")).toBeInTheDocument();
      });
    });

    it("does not render HarborReplicationTable when registry is not harbor", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({
          containerImage: { registry: "ecr", image: "myorg/myapp" },
        }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "auth-service" })).toBeInTheDocument();
      });
      expect(screen.queryByTestId("harbor-replication-table")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // FinOps feature coverage (Phase 19)
  // ---------------------------------------------------------------------------
  describe("FinOps feature coverage", () => {
    const mockEstimate = {
      id: "est-1",
      componentId: "comp-1",
      pipelineRunId: null,
      estimatedMonthlyCost: 42.5,
      diffMonthlyCost: 5.0,
      currency: "USD",
      breakdown: null,
      measuredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("renders CostEstimateCard when a cost estimate is available", async () => {
      mockGetComponent.mockResolvedValue(makeComponent());
      mockGetCostEstimate.mockResolvedValue(mockEstimate);

      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByTestId("cost-estimate-card-stub")).toBeInTheDocument();
      });
    });

    it("does not render CostEstimateCard when no cost estimate is returned", async () => {
      mockGetComponent.mockResolvedValue(makeComponent());
      mockGetCostEstimate.mockResolvedValue(null);

      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "auth-service" })).toBeInTheDocument();
      });
      expect(screen.queryByTestId("cost-estimate-card-stub")).not.toBeInTheDocument();
    });

    it("renders CostBudgetExceededBanner when estimated cost exceeds the component budget", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ costBudgetUsd: 30 }),
      );
      // estimatedMonthlyCost (42.5) > costBudgetUsd (30)
      mockGetCostEstimate.mockResolvedValue({ ...mockEstimate, estimatedMonthlyCost: 42.5 });

      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByTestId("cost-budget-exceeded-banner-stub")).toBeInTheDocument();
      });
    });

    it("does not render CostBudgetExceededBanner when estimated cost is within budget", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ costBudgetUsd: 100 }),
      );
      // estimatedMonthlyCost (42.5) < costBudgetUsd (100)
      mockGetCostEstimate.mockResolvedValue({ ...mockEstimate, estimatedMonthlyCost: 42.5 });

      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "auth-service" })).toBeInTheDocument();
      });
      expect(screen.queryByTestId("cost-budget-exceeded-banner-stub")).not.toBeInTheDocument();
    });

    it("dismisses the budget banner when its onDismiss callback is invoked", async () => {
      const user = userEvent.setup();

      mockGetComponent.mockResolvedValue(makeComponent({ costBudgetUsd: 10 }));
      // estimatedMonthlyCost (42.5) > costBudgetUsd (10) → banner is shown
      mockGetCostEstimate.mockResolvedValue({ ...mockEstimate, estimatedMonthlyCost: 42.5 });

      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByTestId("cost-budget-exceeded-banner-stub")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Dismiss banner" }));

      await waitFor(() => {
        expect(screen.queryByTestId("cost-budget-exceeded-banner-stub")).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // lifecycleVariant and deploymentStatusVariant coverage
  // ---------------------------------------------------------------------------
  describe("lifecycleVariant badge styling", () => {
    it("renders lifecycle badge for 'experimental' components", async () => {
      mockGetComponent.mockResolvedValue(makeComponent({ lifecycle: "experimental" }));
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByText("experimental")).toBeInTheDocument();
      });
    });

    it("renders lifecycle badge for 'deprecated' components", async () => {
      mockGetComponent.mockResolvedValue(makeComponent({ lifecycle: "deprecated" }));
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByText("deprecated")).toBeInTheDocument();
      });
    });

    it("renders lifecycle badge for 'decommissioned' components", async () => {
      mockGetComponent.mockResolvedValue(makeComponent({ lifecycle: "decommissioned" }));
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByText("decommissioned")).toBeInTheDocument();
      });
    });

    it("renders lifecycle badge for unknown lifecycle values", async () => {
      mockGetComponent.mockResolvedValue(makeComponent({ lifecycle: "staging" }));
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByText("staging")).toBeInTheDocument();
      });
    });
  });

  describe("deploymentStatusVariant badge styling", () => {
    const makeDeployment = (status: string) => ({
      id: `d-${status}`,
      version: "1.0.0",
      status,
      componentId: "comp-1",
      environmentId: "env-1",
      environment: { id: "env-1", name: "production" },
      triggeredBy: "alice",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    it("renders 'in_progress' deployment badge", async () => {
      mockGetComponent.mockResolvedValue(makeComponent());
      mockListDeployments.mockResolvedValue({
        data: [makeDeployment("in_progress")],
        total: 1,
      });
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByText("in_progress")).toBeInTheDocument();
      });
    });

    it("renders 'pending' deployment badge", async () => {
      mockGetComponent.mockResolvedValue(makeComponent());
      mockListDeployments.mockResolvedValue({
        data: [makeDeployment("pending")],
        total: 1,
      });
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByText("pending")).toBeInTheDocument();
      });
    });

    it("renders 'failed' deployment badge", async () => {
      mockGetComponent.mockResolvedValue(makeComponent());
      mockListDeployments.mockResolvedValue({
        data: [makeDeployment("failed")],
        total: 1,
      });
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByText("failed")).toBeInTheDocument();
      });
    });

    it("renders 'rolled_back' deployment badge", async () => {
      mockGetComponent.mockResolvedValue(makeComponent());
      mockListDeployments.mockResolvedValue({
        data: [makeDeployment("rolled_back")],
        total: 1,
      });
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByText("rolled_back")).toBeInTheDocument();
      });
    });

    it("renders 'cancelled' deployment badge (default variant)", async () => {
      mockGetComponent.mockResolvedValue(makeComponent());
      mockListDeployments.mockResolvedValue({
        data: [makeDeployment("cancelled")],
        total: 1,
      });
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByText("cancelled")).toBeInTheDocument();
      });
    });
  });
});
