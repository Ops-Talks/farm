import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type {
  ArgoCDApplication,
  CatalogComponent,
  CircleCIPipeline,
  JenkinsJob,
  TravisBuild,
} from "@/types/api";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListApplications = vi.fn();
const mockSyncApplication = vi.fn();
const mockListPipelines = vi.fn();
const mockTriggerPipeline = vi.fn();
const mockListJobs = vi.fn();
const mockTriggerBuild = vi.fn();
const mockListBuilds = vi.fn();
const mockRestartBuild = vi.fn();

vi.mock("@/lib/api-client", () => ({
  argocd: {
    listApplications: (...args: unknown[]) => mockListApplications(...args),
    syncApplication: (...args: unknown[]) => mockSyncApplication(...args),
  },
  circleci: {
    listPipelines: (...args: unknown[]) => mockListPipelines(...args),
    triggerPipeline: (...args: unknown[]) => mockTriggerPipeline(...args),
  },
  jenkins: {
    listJobs: (...args: unknown[]) => mockListJobs(...args),
    triggerBuild: (...args: unknown[]) => mockTriggerBuild(...args),
  },
  travisci: {
    listBuilds: (...args: unknown[]) => mockListBuilds(...args),
    restartBuild: (...args: unknown[]) => mockRestartBuild(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ hasRole: vi.fn().mockReturnValue(false) }),
}));

import { CICDTab } from "./CICDTab";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
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

function buildArgoCDApp(overrides: Partial<ArgoCDApplication> = {}): ArgoCDApplication {
  return {
    name: "my-app",
    namespace: "default",
    status: {
      health: { status: "Healthy" },
      sync: { status: "Synced" },
    },
    spec: {
      source: {
        repoURL: "https://github.com/org/repo",
        targetRevision: "HEAD",
      },
    },
    ...overrides,
  };
}

function buildPipeline(overrides: Partial<CircleCIPipeline> = {}): CircleCIPipeline {
  return {
    id: "pipe-1",
    number: 42,
    project_slug: "gh/org/repo",
    state: "created",
    trigger: { type: "webhook" },
    updated_at: "2024-01-15T10:00:00Z",
    ...overrides,
  };
}

function buildJob(overrides: Partial<JenkinsJob> = {}): JenkinsJob {
  return {
    name: "build-service",
    url: "https://jenkins.example.com/job/build-service",
    color: "blue",
    lastBuild: { number: 101, result: "SUCCESS", timestamp: 1705312800000, duration: 90000 },
    ...overrides,
  };
}

function buildTravisBuild(overrides: Partial<TravisBuild> = {}): TravisBuild {
  return {
    id: 999,
    number: "55",
    state: "passed",
    started_at: "2024-01-15T10:00:00Z",
    finished_at: "2024-01-15T10:05:00Z",
    branch: { name: "main" },
    repository: { slug: "org/repo" },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("CICDTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: return empty arrays for all queries
    mockListApplications.mockResolvedValue([]);
    mockListPipelines.mockResolvedValue([]);
    mockListJobs.mockResolvedValue([]);
    mockListBuilds.mockResolvedValue([]);
  });

  it("renders section headers for all four providers", async () => {
    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("ArgoCD")).toBeInTheDocument();
    });
    expect(screen.getByText("CircleCI")).toBeInTheDocument();
    expect(screen.getByText("Jenkins")).toBeInTheDocument();
    expect(screen.getByText("Travis CI")).toBeInTheDocument();
  });

  it("shows empty state messages when all queries return empty", async () => {
    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("No ArgoCD applications found for this component."),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("No CircleCI pipelines found for this component."),
    ).toBeInTheDocument();
    expect(screen.getByText("No Jenkins jobs found.")).toBeInTheDocument();
    expect(
      screen.getByText("No Travis CI builds found for this component."),
    ).toBeInTheDocument();
  });

  // ─── ArgoCD ───────────────────────────────────────────────────────────────

  it("renders ArgoCD application name and health badge", async () => {
    mockListApplications.mockResolvedValue([
      buildArgoCDApp({ name: "my-production-app", status: { health: { status: "Healthy" }, sync: { status: "Synced" } } }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("my-production-app")).toBeInTheDocument();
    });
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders ArgoCD health badge with Degraded status in red", async () => {
    mockListApplications.mockResolvedValue([
      buildArgoCDApp({ status: { health: { status: "Degraded" }, sync: { status: "OutOfSync" } } }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Degraded")).toBeInTheDocument();
    });
    const badge = screen.getByText("Degraded");
    expect(badge.className).toContain("bg-red-100");
    expect(badge.className).toContain("text-red-800");
  });

  it("renders ArgoCD health badge with Progressing status in yellow", async () => {
    mockListApplications.mockResolvedValue([
      buildArgoCDApp({ status: { health: { status: "Progressing" }, sync: { status: "Synced" } } }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Progressing")).toBeInTheDocument();
    });
    const badge = screen.getByText("Progressing");
    expect(badge.className).toContain("bg-yellow-100");
  });

  it("renders ArgoCD sync status badge", async () => {
    mockListApplications.mockResolvedValue([
      buildArgoCDApp({ status: { health: { status: "Healthy" }, sync: { status: "OutOfSync" } } }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("OutOfSync")).toBeInTheDocument();
    });
    const badge = screen.getByText("OutOfSync");
    expect(badge.className).toContain("bg-orange-100");
  });

  it("does not show sync button when user is not admin", async () => {
    mockListApplications.mockResolvedValue([buildArgoCDApp()]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("my-app")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /sync/i })).not.toBeInTheDocument();
  });

  // ─── CircleCI ─────────────────────────────────────────────────────────────

  it("renders CircleCI pipeline number and state badge", async () => {
    mockListPipelines.mockResolvedValue([
      buildPipeline({ number: 77, state: "created", project_slug: "gh/myorg/myrepo" }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("77")).toBeInTheDocument();
    });
    expect(screen.getByText("gh/myorg/myrepo")).toBeInTheDocument();
    expect(screen.getByText("created")).toBeInTheDocument();
  });

  it("passes component.vcsUrl to circleci.listPipelines", async () => {
    mockListPipelines.mockResolvedValue([]);
    const comp = buildComponent({ vcsUrl: "https://github.com/org/my-repo" });

    render(<CICDTab component={comp} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockListPipelines).toHaveBeenCalledWith("https://github.com/org/my-repo");
    });
  });

  // ─── Jenkins ──────────────────────────────────────────────────────────────

  it("renders Jenkins job name and last build result badge", async () => {
    mockListJobs.mockResolvedValue([
      buildJob({ name: "deploy-api", lastBuild: { number: 12, result: "SUCCESS", timestamp: 0, duration: 30000 } }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("deploy-api")).toBeInTheDocument();
    });
    expect(screen.getByText("SUCCESS")).toBeInTheDocument();
    const badge = screen.getByText("SUCCESS");
    expect(badge.className).toContain("bg-green-100");
  });

  it("renders Jenkins FAILURE badge in red", async () => {
    mockListJobs.mockResolvedValue([
      buildJob({ lastBuild: { number: 5, result: "FAILURE", timestamp: 0, duration: 10000 } }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("FAILURE")).toBeInTheDocument();
    });
    const badge = screen.getByText("FAILURE");
    expect(badge.className).toContain("bg-red-100");
  });

  it("renders Jenkins UNSTABLE badge in yellow", async () => {
    mockListJobs.mockResolvedValue([
      buildJob({ lastBuild: { number: 8, result: "UNSTABLE", timestamp: 0, duration: 50000 } }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("UNSTABLE")).toBeInTheDocument();
    });
    const badge = screen.getByText("UNSTABLE");
    expect(badge.className).toContain("bg-yellow-100");
  });

  // ─── Travis CI ────────────────────────────────────────────────────────────

  it("renders Travis CI build number, state, and branch", async () => {
    mockListBuilds.mockResolvedValue([
      buildTravisBuild({ number: "99", state: "passed", branch: { name: "main" } }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("99")).toBeInTheDocument();
    });
    expect(screen.getByText("passed")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("renders Travis CI state badge as green for passed state", async () => {
    mockListBuilds.mockResolvedValue([
      buildTravisBuild({ state: "passed" }),
    ]);

    render(<CICDTab component={buildComponent()} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("passed")).toBeInTheDocument();
    });
    const badge = screen.getByText("passed");
    expect(badge.className).toContain("bg-green-100");
  });
});
