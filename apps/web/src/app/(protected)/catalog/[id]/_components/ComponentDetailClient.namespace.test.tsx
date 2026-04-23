import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetComponent = vi.fn();
const mockListDeployments = vi.fn();
const mockPush = vi.fn();
const mockGetCostEstimate = vi.fn().mockResolvedValue(null);
const mockGetActualCost = vi.fn().mockResolvedValue(null);
const mockLinkerdGetStatus = vi.fn().mockResolvedValue({ installed: false, components: [] });
const mockGatekeeperIsEnabled = vi.fn().mockResolvedValue({ enabled: false });
const mockOpaGetStatus = vi.fn().mockResolvedValue({ reachable: false, url: "" });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/catalog/comp-ns",
  useParams: () => ({ id: "comp-ns" }),
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

// Stub LogPipelineCard to avoid setting up a QueryClient and Kubernetes API mock
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/LogPipelineCard",
  () => ({
    LogPipelineCard: ({ namespace }: { namespace: string }) => (
      <div data-testid="log-pipeline-stub">{namespace}</div>
    ),
  }),
);

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
    getStatus: (...args: unknown[]) => mockLinkerdGetStatus(...args),
  },
  gatekeeper: {
    isEnabled: (...args: unknown[]) => mockGatekeeperIsEnabled(...args),
  },
  opa: {
    getStatus: (...args: unknown[]) => mockOpaGetStatus(...args),
  },
}));

vi.mock("@/lib/otel-spans", () => ({
  recordSpan: vi.fn((_name: unknown, fn: () => unknown) => fn()),
}));

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
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/ConstraintTemplateTable",
  () => ({ ConstraintTemplateTable: () => <div data-testid="constraint-template-table-stub" /> }),
);
vi.mock(
  "@/app/(protected)/catalog/[id]/_components/OpaEvaluationPanel",
  () => ({ OpaEvaluationPanel: () => <div data-testid="opa-evaluation-panel-stub" /> }),
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
  id: "comp-ns",
  name: "ns-service",
  kind: "service",
  lifecycle: "production",
  description: "Service with a namespace",
  repositoryUrl: "https://github.com/example/ns-service",
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

describe("ComponentDetailClient — namespace / LogPipelineCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListDeployments.mockResolvedValue({ data: [], total: 0 });
    mockGatekeeperIsEnabled.mockResolvedValue({ enabled: false });
    mockOpaGetStatus.mockResolvedValue({ reachable: false, url: "" });
  });

  it("renders the LogPipelineCard stub when the component has a namespace", async () => {
    mockGetComponent.mockResolvedValue(makeComponent({ namespace: "elastic" }));

    render(<ComponentDetailClient />);

    await waitFor(() => {
      expect(screen.getByTestId("log-pipeline-stub")).toBeInTheDocument();
    });

    expect(screen.getByTestId("log-pipeline-stub")).toHaveTextContent("elastic");
  });

  it("does NOT render the LogPipelineCard stub when the component has no namespace", async () => {
    // makeComponent does not include 'namespace', so component.namespace is undefined
    mockGetComponent.mockResolvedValue(makeComponent());

    render(<ComponentDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("ns-service")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("log-pipeline-stub")).not.toBeInTheDocument();
  });
});
