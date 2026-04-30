import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// --- Wrapper: fresh QueryClient per test so cache never leaks between tests ---
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

const mockListTeams = vi.fn();
vi.mock("@/lib/api-client", () => ({
  teams: { list: () => mockListTeams() },
}));

const mockHasRole = vi.fn(() => false);
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    hasRole: mockHasRole,
    user: null,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/types/api", () => ({
  TeamType: {
    DEV: "dev",
    INFRA: "infra",
    SECURITY: "security",
    DATA: "data",
    PLATFORM: "platform",
    OTHER: "other",
  },
}));

import TeamsPage from "@/app/(protected)/teams/page";

// ── Accessibility (axe) ────────────────────────────────────────────────────────
import { axe } from "vitest-axe";

const mockTeam = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  name: "team-alpha",
  displayName: "Team Alpha",
  type: "dev",
  description: "Alpha squad",
  contactEmail: "alpha@farm.dev",
  slackChannel: "alpha",
  ...overrides,
});

const mockPaginated = <T,>(data: T[]) => ({ data, total: data.length, skip: 0, take: 20 });

describe("TeamsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole.mockReturnValue(false);
  });

  it("should render heading and team count", async () => {
    mockListTeams.mockResolvedValue(mockPaginated([mockTeam()]));
    render(<TeamsPage />, { wrapper: createWrapper() });

    // Wait for both the heading AND the count — the count only appears after
    // the query resolves (the Teams heading itself is always rendered).
    await waitFor(() => {
      expect(screen.getByText("Teams")).toBeInTheDocument();
      expect(screen.getByText("1 team registered")).toBeInTheDocument();
    });
  });

  it("should display team cards", async () => {
    mockListTeams.mockResolvedValue(mockPaginated([mockTeam()]));
    render(<TeamsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText("team-alpha")).toBeInTheDocument();
    expect(screen.getByText("Alpha squad")).toBeInTheDocument();
    expect(screen.getByText("alpha@farm.dev")).toBeInTheDocument();
    expect(screen.getByText("#alpha")).toBeInTheDocument();
  });

  it("should show Create Team button only for admins", async () => {
    mockListTeams.mockResolvedValue(mockPaginated([]));
    mockHasRole.mockReturnValue(true);
    render(<TeamsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create Team")).toBeInTheDocument();
    });
  });

  it("should hide Create Team button for non-admins", async () => {
    mockListTeams.mockResolvedValue(mockPaginated([]));
    render(<TeamsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Teams")).toBeInTheDocument();
    });
    expect(screen.queryByText("Create Team")).not.toBeInTheDocument();
  });

  it("should filter teams by search", async () => {
    const user = userEvent.setup();
    mockListTeams.mockResolvedValue(mockPaginated([
      mockTeam({ id: "t1", name: "team-alpha", displayName: "Team Alpha" }),
      mockTeam({ id: "t2", name: "team-beta", displayName: "Team Beta" }),
    ]));

    render(<TeamsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search teams..."), "beta");

    expect(screen.queryByText("Team Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Team Beta")).toBeInTheDocument();
  });

  it("should show empty state", async () => {
    mockListTeams.mockResolvedValue(mockPaginated([]));
    render(<TeamsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No teams registered")).toBeInTheDocument();
    });
  });

  it("should show filter empty state", async () => {
    const user = userEvent.setup();
    mockListTeams.mockResolvedValue(mockPaginated([mockTeam()]));
    render(<TeamsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search teams..."), "nonexistent");

    expect(screen.getByText("No teams match your filters.")).toBeInTheDocument();
  });

  it("should render type filter buttons", async () => {
    mockListTeams.mockResolvedValue(mockPaginated([]));
    render(<TeamsPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.getByText("Infra")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  // ── Accessibility ─────────────────────────────────────────────────────────────

  it("has no accessibility violations", async () => {
    mockListTeams.mockResolvedValue(mockPaginated([mockTeam()]));

    const { container } = render(<TeamsPage />, { wrapper: createWrapper() });

    // Wait for team cards to render before scanning
    await waitFor(() =>
      expect(screen.getByText("Team Alpha")).toBeInTheDocument(),
    );

    const results = await axe(container, {
      rules: {
        // jsdom cannot compute CSS colors — disable to avoid false positives
        "color-contrast": { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  }, 10000);
});
