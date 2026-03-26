import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OrganizationProvider,
  useOrganization,
  ORG_STORAGE_KEY,
} from "./organization-context";

vi.mock("@/lib/api-client", () => ({
  organizations: {
    list: vi.fn(),
  },
}));

import { organizations as orgsApi } from "@/lib/api-client";

const mockOrgs = [
  { id: "org-1", name: "Org One", slug: "org-one" },
  { id: "org-2", name: "Org Two", slug: "org-two" },
] as Parameters<typeof orgsApi.list>[never] extends never
  ? never
  : Awaited<ReturnType<typeof orgsApi.list>>;

function TestConsumer() {
  const { organizations, currentOrg, isLoading, switchOrg } =
    useOrganization();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="current">{currentOrg?.id ?? "none"}</span>
      <span data-testid="count">{organizations.length}</span>
      <button onClick={() => switchOrg(mockOrgs[1])}>Switch to Org Two</button>
    </div>
  );
}

describe("OrganizationProvider", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("loads organizations on mount", async () => {
    vi.mocked(orgsApi.list).mockResolvedValue(mockOrgs as never);

    render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("current").textContent).toBe("none");
  });

  it("auto-selects the only org when user belongs to exactly one", async () => {
    const singleOrg = [mockOrgs[0]];
    vi.mocked(orgsApi.list).mockResolvedValue(singleOrg as never);

    render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("current").textContent).toBe("org-1");
    });

    expect(sessionStorage.getItem(ORG_STORAGE_KEY)).toBe("org-1");
  });

  it("restores previously selected org from sessionStorage", async () => {
    sessionStorage.setItem(ORG_STORAGE_KEY, "org-2");
    vi.mocked(orgsApi.list).mockResolvedValue(mockOrgs as never);

    render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("current").textContent).toBe("org-2");
    });
  });

  it("clears stale org from sessionStorage when user is no longer a member", async () => {
    // Simulate a stale org ID (org was deleted or user was removed)
    sessionStorage.setItem(ORG_STORAGE_KEY, "org-deleted");
    vi.mocked(orgsApi.list).mockResolvedValue(mockOrgs as never);

    render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    // currentOrg should be null (no match found)
    expect(screen.getByTestId("current").textContent).toBe("none");
    // sessionStorage must be cleared to avoid sending stale X-Organization-Id header
    expect(sessionStorage.getItem(ORG_STORAGE_KEY)).toBeNull();
  });

  it("updates sessionStorage when switching org", async () => {
    vi.mocked(orgsApi.list).mockResolvedValue(mockOrgs as never);

    render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    await act(async () => {
      await userEvent.click(screen.getByText("Switch to Org Two"));
    });

    expect(screen.getByTestId("current").textContent).toBe("org-2");
    expect(sessionStorage.getItem(ORG_STORAGE_KEY)).toBe("org-2");
  });

  it("keeps state unchanged when API fetch fails", async () => {
    vi.mocked(orgsApi.list).mockRejectedValue(new Error("Network error"));

    render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(screen.getByTestId("current").textContent).toBe("none");
  });

  it("throws when useOrganization is used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useOrganization must be used within an OrganizationProvider",
    );
    spy.mockRestore();
  });

  it("refreshOrgs re-fetches organizations from the API", async () => {
    vi.mocked(orgsApi.list).mockResolvedValue(mockOrgs as never);

    function TestRefreshConsumer() {
      const { organizations, isLoading, refreshOrgs } = useOrganization();
      return (
        <div>
          <span data-testid="loading">{String(isLoading)}</span>
          <span data-testid="count">{organizations.length}</span>
          <button onClick={() => void refreshOrgs()}>Refresh</button>
        </div>
      );
    }

    render(
      <OrganizationProvider>
        <TestRefreshConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(orgsApi.list).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(orgsApi.list).toHaveBeenCalledTimes(2);
    });
  });
});
