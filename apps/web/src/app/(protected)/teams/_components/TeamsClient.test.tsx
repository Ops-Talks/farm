import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockList = vi.fn();
const mockHasRole = vi.fn();

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
  teams: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ hasRole: mockHasRole }),
}));

const mockUsePermission = vi.fn(() => false);
vi.mock("@/hooks/use-permission", () => ({
  usePermission: (...args: unknown[]) => mockUsePermission(...args),
}));

// ── Import component after mocks ──────────────────────────────────────────────

import { TeamsClient } from "./TeamsClient";

// ── Wrapper ───────────────────────────────────────────────────────────────────

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

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTeam(overrides: Record<string, unknown> = {}) {
  return {
    id: "team-1",
    name: "platform-team",
    displayName: "Platform Team",
    type: "dev",
    description: "The platform engineering team",
    contactEmail: "platform@example.com",
    slackChannel: "platform-eng",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TeamsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole.mockReturnValue(false);
    mockUsePermission.mockReturnValue(false);
  });

  // ── Loading state ────────────────────────────────────────────────────────────

  it("renders loading skeleton cards while the query is in flight", () => {
    // A never-resolving promise keeps isLoading=true
    mockList.mockReturnValue(new Promise(() => {}));

    render(<TeamsClient />, { wrapper: createWrapper() });

    // The teams grid and empty-state text must NOT appear during loading
    expect(screen.queryByText("No teams registered")).not.toBeInTheDocument();
    expect(screen.queryByText("No teams match your filters.")).not.toBeInTheDocument();
  });

  // ── Empty state — no teams registered ────────────────────────────────────────

  it("shows the 'no teams registered' message when the list is empty", async () => {
    mockList.mockResolvedValue({ data: [] });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No teams registered")).toBeInTheDocument();
    });
  });

  // ── Header count — plural ────────────────────────────────────────────────────

  it("shows plural 'teams' in the header when there are multiple teams", async () => {
    mockList.mockResolvedValue({
      data: [makeTeam({ id: "t1" }), makeTeam({ id: "t2" })],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("2 teams registered")).toBeInTheDocument();
    });
  });

  // ── Header count — singular ──────────────────────────────────────────────────

  it("shows singular 'team' in the header when there is exactly one team", async () => {
    mockList.mockResolvedValue({ data: [makeTeam()] });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("1 team registered")).toBeInTheDocument();
    });
  });

  // ── Admin role — Create Team button visible ──────────────────────────────────

  it("shows the Create Team button for admin users", async () => {
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockUsePermission.mockReturnValue(true);
    mockList.mockResolvedValue({ data: [] });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Create Team")).toBeInTheDocument();
    });

    expect(screen.getByText("Create Team").closest("a")).toHaveAttribute(
      "href",
      "/teams/new",
    );
  });

  // ── Non-admin role — Create Team button hidden ───────────────────────────────

  it("hides the Create Team button for non-admin users", async () => {
    mockHasRole.mockReturnValue(false);
    mockList.mockResolvedValue({ data: [] });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No teams registered")).toBeInTheDocument();
    });

    expect(screen.queryByText("Create Team")).not.toBeInTheDocument();
  });

  // ── Team card — all optional fields present ──────────────────────────────────

  it("renders description, contact email, and Slack channel when present", async () => {
    mockList.mockResolvedValue({
      data: [
        makeTeam({
          displayName: "Engineering Hub",
          description: "Core infrastructure team",
          contactEmail: "eng@example.com",
          slackChannel: "eng-hub",
        }),
      ],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Engineering Hub")).toBeInTheDocument();
    });

    expect(screen.getByText("Core infrastructure team")).toBeInTheDocument();
    expect(screen.getByText("eng@example.com")).toBeInTheDocument();
    expect(screen.getByText("#eng-hub")).toBeInTheDocument();
  });

  // ── Team card — optional fields absent ──────────────────────────────────────

  it("does not render optional fields when they are absent", async () => {
    mockList.mockResolvedValue({
      data: [
        makeTeam({
          description: undefined,
          contactEmail: undefined,
          slackChannel: undefined,
        }),
      ],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Platform Team")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("platform@example.com"),
    ).not.toBeInTheDocument();
  });

  // ── Search filter — matching teams ───────────────────────────────────────────

  it("filters the list by display name when a search term is entered", async () => {
    mockList.mockResolvedValue({
      data: [
        makeTeam({ id: "t1", displayName: "Alpha Squad", name: "alpha-squad" }),
        makeTeam({ id: "t2", displayName: "Beta Squad", name: "beta-squad" }),
      ],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Alpha Squad")).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText("Search teams..."), "Alpha");

    await waitFor(() => {
      expect(screen.getByText("Alpha Squad")).toBeInTheDocument();
      expect(screen.queryByText("Beta Squad")).not.toBeInTheDocument();
    });
  });

  // ── Search filter — no matches ───────────────────────────────────────────────

  it("shows filtered empty state when the search term matches nothing", async () => {
    mockList.mockResolvedValue({
      data: [makeTeam({ displayName: "Platform Team" })],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Platform Team")).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText("Search teams..."),
      "zzz-no-match",
    );

    await waitFor(() => {
      expect(
        screen.getByText("No teams match your filters."),
      ).toBeInTheDocument();
    });
  });

  // ── Search filter — matches description ──────────────────────────────────────

  it("includes team description in search matching", async () => {
    mockList.mockResolvedValue({
      data: [
        makeTeam({
          id: "t1",
          displayName: "Team One",
          description: "Kubernetes operators",
          contactEmail: undefined,
          slackChannel: undefined,
        }),
        makeTeam({
          id: "t2",
          displayName: "Team Two",
          description: "React frontends",
          contactEmail: undefined,
          slackChannel: undefined,
        }),
      ],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Team One")).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText("Search teams..."),
      "kubernetes",
    );

    await waitFor(() => {
      expect(screen.getByText("Team One")).toBeInTheDocument();
      expect(screen.queryByText("Team Two")).not.toBeInTheDocument();
    });
  });

  // ── Type filter — matching teams ─────────────────────────────────────────────

  it("filters the list to only show teams of the selected type", async () => {
    mockList.mockResolvedValue({
      data: [
        makeTeam({ id: "t1", displayName: "Dev Team", type: "dev" }),
        makeTeam({ id: "t2", displayName: "Infra Team", type: "infra" }),
      ],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Dev Team")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Infra" }));

    await waitFor(() => {
      expect(screen.getByText("Infra Team")).toBeInTheDocument();
      expect(screen.queryByText("Dev Team")).not.toBeInTheDocument();
    });
  });

  // ── Type filter — no matching teams ──────────────────────────────────────────

  it("shows filtered empty state when the type filter matches no teams", async () => {
    mockList.mockResolvedValue({
      data: [makeTeam({ type: "dev" })],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Platform Team")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Security" }));

    await waitFor(() => {
      expect(
        screen.getByText("No teams match your filters."),
      ).toBeInTheDocument();
    });
  });

  // ── TeamType badge colors ─────────────────────────────────────────────────────
  // Each case exercises a different branch of teamTypeBadgeColor.

  it("renders badge with DEV team type", async () => {
    mockList.mockResolvedValue({ data: [makeTeam({ type: "dev" })] });
    render(<TeamsClient />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText("dev")).toBeInTheDocument());
  });

  it("renders badge with INFRA team type", async () => {
    mockList.mockResolvedValue({ data: [makeTeam({ type: "infra" })] });
    render(<TeamsClient />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText("infra")).toBeInTheDocument());
  });

  it("renders badge with SECURITY team type", async () => {
    mockList.mockResolvedValue({ data: [makeTeam({ type: "security" })] });
    render(<TeamsClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByText("security")).toBeInTheDocument(),
    );
  });

  it("renders badge with DATA team type", async () => {
    mockList.mockResolvedValue({ data: [makeTeam({ type: "data" })] });
    render(<TeamsClient />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText("data")).toBeInTheDocument());
  });

  it("renders badge with PLATFORM team type", async () => {
    mockList.mockResolvedValue({ data: [makeTeam({ type: "platform" })] });
    render(<TeamsClient />, { wrapper: createWrapper() });
    await waitFor(() =>
      expect(screen.getByText("platform")).toBeInTheDocument(),
    );
  });

  it("renders badge with OTHER team type using the default color", async () => {
    mockList.mockResolvedValue({ data: [makeTeam({ type: "other" })] });
    render(<TeamsClient />, { wrapper: createWrapper() });
    await waitFor(() => expect(screen.getByText("other")).toBeInTheDocument());
  });

  // ── Team card links ───────────────────────────────────────────────────────────

  it("wraps each team card in a link pointing to the team detail page", async () => {
    mockList.mockResolvedValue({
      data: [makeTeam({ id: "team-42", displayName: "Link Test Team" })],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Link Test Team")).toBeInTheDocument();
    });

    const card = screen.getByText("Link Test Team").closest("a");
    expect(card).toHaveAttribute("href", "/teams/team-42");
  });

  // ── Team initials avatar ─────────────────────────────────────────────────────

  it("renders avatar initials derived from the team display name", async () => {
    mockList.mockResolvedValue({
      data: [makeTeam({ displayName: "Platform Team" })],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      // "Platform Team" → initials "PT"
      expect(screen.getByText("PT")).toBeInTheDocument();
    });
  });

  // ── Search with description absent (covers `description ?? ""` fallback) ─────

  it("excludes a team with no description when the search query has no match", async () => {
    mockList.mockResolvedValue({
      data: [
        makeTeam({
          id: "t1",
          displayName: "Omega Team",
          name: "omega-team",
          description: undefined,
        }),
        makeTeam({
          id: "t2",
          displayName: "Sigma Team",
          name: "sigma-team",
          description: "Handles observability stack",
        }),
      ],
    });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Omega Team")).toBeInTheDocument();
    });

    // Type a query that matches only the description of t2
    await userEvent.type(
      screen.getByPlaceholderText("Search teams..."),
      "observability",
    );

    await waitFor(() => {
      // t2 description contains "observability" — visible
      expect(screen.getByText("Sigma Team")).toBeInTheDocument();
      // t1 has no description — description ?? "" yields "" which does NOT match
      expect(screen.queryByText("Omega Team")).not.toBeInTheDocument();
    });
  });

  // ── API integration ───────────────────────────────────────────────────────────

  it("calls teams.list() to populate the component", async () => {
    mockList.mockResolvedValue({ data: [] });

    render(<TeamsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledOnce();
    });
  });
});
