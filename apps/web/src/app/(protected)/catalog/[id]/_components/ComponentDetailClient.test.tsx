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

    it("detects self-hosted GitLab (e.g., gitlab.example.com)", async () => {
      mockGetComponent.mockResolvedValue(
        makeComponent({ repositoryUrl: "https://gitlab.example.com/group/project" }),
      );
      render(<ComponentDetailClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /View on GitLab/ })).toBeInTheDocument();
      });
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
});
