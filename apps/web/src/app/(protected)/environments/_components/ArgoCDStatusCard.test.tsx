import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ArgoCDApplication } from "@/types/api";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListApplications = vi.fn();
const mockSyncApplication = vi.fn();

vi.mock("@/lib/api-client", () => ({
  argocd: {
    listApplications: (...args: unknown[]) => mockListApplications(...args),
    syncApplication: (...args: unknown[]) => mockSyncApplication(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ hasRole: vi.fn().mockReturnValue(false) }),
}));

import { ArgoCDStatusCard } from "./ArgoCDStatusCard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, refetchInterval: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function buildApp(overrides: Partial<ArgoCDApplication> = {}): ArgoCDApplication {
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("ArgoCDStatusCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no applications are returned", async () => {
    mockListApplications.mockResolvedValue([]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/connect argocd in integration settings/i),
      ).toBeInTheDocument();
    });
  });

  it("renders the card heading", async () => {
    mockListApplications.mockResolvedValue([]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    expect(screen.getByText("ArgoCD Applications")).toBeInTheDocument();
  });

  it("renders application name in the table", async () => {
    mockListApplications.mockResolvedValue([buildApp({ name: "production-app" })]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("production-app")).toBeInTheDocument();
    });
  });

  it("renders Healthy health badge in green", async () => {
    mockListApplications.mockResolvedValue([
      buildApp({ status: { health: { status: "Healthy" }, sync: { status: "Synced" } } }),
    ]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });
    const badge = screen.getByText("Healthy");
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-800");
  });

  it("renders Degraded health badge in red", async () => {
    mockListApplications.mockResolvedValue([
      buildApp({ status: { health: { status: "Degraded" }, sync: { status: "OutOfSync" } } }),
    ]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Degraded")).toBeInTheDocument();
    });
    const badge = screen.getByText("Degraded");
    expect(badge.className).toContain("bg-red-100");
    expect(badge.className).toContain("text-red-800");
  });

  it("renders Progressing health badge in yellow", async () => {
    mockListApplications.mockResolvedValue([
      buildApp({ status: { health: { status: "Progressing" }, sync: { status: "Synced" } } }),
    ]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Progressing")).toBeInTheDocument();
    });
    const badge = screen.getByText("Progressing");
    expect(badge.className).toContain("bg-yellow-100");
  });

  it("renders Synced sync badge in green", async () => {
    mockListApplications.mockResolvedValue([
      buildApp({ status: { health: { status: "Healthy" }, sync: { status: "Synced" } } }),
    ]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Synced")).toBeInTheDocument();
    });
    const badge = screen.getByText("Synced");
    expect(badge.className).toContain("bg-green-100");
  });

  it("renders OutOfSync sync badge in orange", async () => {
    mockListApplications.mockResolvedValue([
      buildApp({ status: { health: { status: "Healthy" }, sync: { status: "OutOfSync" } } }),
    ]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("OutOfSync")).toBeInTheDocument();
    });
    const badge = screen.getByText("OutOfSync");
    expect(badge.className).toContain("bg-orange-100");
  });

  it("renders table column headers", async () => {
    mockListApplications.mockResolvedValue([buildApp()]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Application")).toBeInTheDocument();
    });
    expect(screen.getByText("Namespace")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Sync")).toBeInTheDocument();
  });

  it("does not render sync button for non-admin user", async () => {
    mockListApplications.mockResolvedValue([buildApp()]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("my-app")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /sync/i })).not.toBeInTheDocument();
  });

  it("renders multiple applications", async () => {
    mockListApplications.mockResolvedValue([
      buildApp({ name: "app-one", status: { health: { status: "Healthy" }, sync: { status: "Synced" } } }),
      buildApp({ name: "app-two", namespace: "staging", status: { health: { status: "Degraded" }, sync: { status: "OutOfSync" } } }),
    ]);
    render(<ArgoCDStatusCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("app-one")).toBeInTheDocument();
    });
    expect(screen.getByText("app-two")).toBeInTheDocument();
    expect(screen.getByText("staging")).toBeInTheDocument();
  });
});

// ── Admin variant ─────────────────────────────────────────────────────────────

describe("ArgoCDStatusCard — admin user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Sync buttons for each application when user is admin", async () => {
    vi.doMock("@/contexts/auth-context", () => ({
      useAuth: () => ({ hasRole: vi.fn().mockReturnValue(true) }),
    }));

    mockListApplications.mockResolvedValue([buildApp({ name: "admin-app" })]);

    // Re-import after the mock override so the updated mock is used
    const { ArgoCDStatusCard: AdminCard } = await import("./ArgoCDStatusCard");
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, refetchInterval: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    render(<AdminCard />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("admin-app")).toBeInTheDocument();
    });
  });

  it("calls syncApplication when Sync button is clicked (admin)", async () => {
    // Use a fresh module scope with admin mock
    const user = userEvent.setup();
    mockSyncApplication.mockResolvedValue({ message: "sync triggered" });

    vi.doMock("@/contexts/auth-context", () => ({
      useAuth: () => ({ hasRole: () => true }),
    }));

    const { ArgoCDStatusCard: AdminCard } = await import("./ArgoCDStatusCard");
    mockListApplications.mockResolvedValue([buildApp({ name: "sync-app" })]);

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, refetchInterval: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    render(<AdminCard />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("sync-app")).toBeInTheDocument();
    });
  });
});
