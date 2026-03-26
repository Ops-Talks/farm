import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockListOrgs = vi.fn();
const mockSwitchOrg = vi.fn();

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
  organizations: { list: () => mockListOrgs() },
}));

// Mutable current-org ref so individual tests can override it
let currentOrgOverride: ReturnType<typeof makeOrg> | null = null;

vi.mock("@/contexts/organization-context", () => ({
  useOrganization: () => ({
    currentOrg: currentOrgOverride,
    switchOrg: mockSwitchOrg,
  }),
}));

import { OrgsClient } from "@/app/(protected)/organizations/_components/OrgsClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function makeOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: "org-1",
    name: "Acme Corp",
    slug: "acme",
    description: "Main organization",
    ownerId: "u1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("OrgsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentOrgOverride = null;
  });

  it("renders skeleton grid while loading", () => {
    mockListOrgs.mockReturnValue(new Promise(() => {}));
    render(<OrgsClient />);
    expect(screen.getByText("Loading\u2026")).toBeInTheDocument();
  });

  it("renders empty state when no organizations exist", async () => {
    mockListOrgs.mockResolvedValue([]);
    render(<OrgsClient />);

    await waitFor(() => {
      expect(screen.getByText("No organizations yet")).toBeInTheDocument();
    });
  });

  it("renders org cards after data loads", async () => {
    mockListOrgs.mockResolvedValue([makeOrg()]);
    render(<OrgsClient />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("acme")).toBeInTheDocument();
    expect(screen.getByText("Main organization")).toBeInTheDocument();
  });

  it("shows 'Active' badge for the current org", async () => {
    const org = makeOrg({ id: "org-active" });
    mockListOrgs.mockResolvedValue([org]);
    currentOrgOverride = org;

    render(<OrgsClient />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders 'Switch' button for inactive orgs", async () => {
    mockListOrgs.mockResolvedValue([makeOrg()]);
    render(<OrgsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch" })).toBeInTheDocument();
    });
  });

  it("calls switchOrg when 'Switch' button is clicked", async () => {
    const user = userEvent.setup();
    const org = makeOrg();
    mockListOrgs.mockResolvedValue([org]);
    render(<OrgsClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Switch" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Switch" }));
    expect(mockSwitchOrg).toHaveBeenCalledWith(org);
  });

  it("renders 'Create Organization' link", async () => {
    mockListOrgs.mockResolvedValue([]);
    render(<OrgsClient />);

    await waitFor(() => {
      expect(screen.getAllByText("Create Organization").length).toBeGreaterThan(0);
    });
  });

  it("shows plural count when multiple orgs exist", async () => {
    mockListOrgs.mockResolvedValue([
      makeOrg(),
      makeOrg({ id: "org-2", name: "Beta Inc", slug: "beta" }),
    ]);
    render(<OrgsClient />);

    await waitFor(() => {
      expect(screen.getByText("2 organizations")).toBeInTheDocument();
    });
  });

  it("shows singular count for one org", async () => {
    mockListOrgs.mockResolvedValue([makeOrg()]);
    render(<OrgsClient />);

    await waitFor(() => {
      expect(screen.getByText("1 organization")).toBeInTheDocument();
    });
  });
});

