import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OrganizationProvider,
  useOrganization,
  ORG_STORAGE_KEY,
} from "./organization-context";

// Mock useAuth so OrganizationProvider can be tested in isolation.
// isAuthenticated starts true by default so existing tests keep working.
const mockIsAuthenticated = { value: true };

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}));

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
    mockIsAuthenticated.value = true; // reset to authenticated for each test
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("loads organizations on mount and auto-selects first", async () => {
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
    // First org is now auto-selected
    expect(screen.getByTestId("current").textContent).toBe("org-1");
    expect(sessionStorage.getItem(ORG_STORAGE_KEY)).toBe("org-1");
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

  it("falls back to first available org when saved org is stale", async () => {
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

    // Falls back to first available org instead of null
    expect(screen.getByTestId("current").textContent).toBe("org-1");
    // sessionStorage must be updated to the fallback org
    expect(sessionStorage.getItem(ORG_STORAGE_KEY)).toBe("org-1");
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

  it("clears org state immediately when user becomes unauthenticated", async () => {
    vi.mocked(orgsApi.list).mockResolvedValue(mockOrgs as never);

    // Start authenticated so orgs load
    mockIsAuthenticated.value = true;
    const { rerender } = render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("2");
    });

    // Simulate logout — set isAuthenticated to false and rerender to trigger effect
    mockIsAuthenticated.value = false;
    rerender(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("0");
      expect(screen.getByTestId("current").textContent).toBe("none");
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
  });

  it("re-fetches when farm:org:stale event is dispatched", async () => {
    vi.mocked(orgsApi.list)
      .mockResolvedValueOnce(mockOrgs as never)  // initial load
      .mockResolvedValueOnce([mockOrgs[0]] as never); // after stale event

    render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("2");
    });

    // Dispatch the stale event as api-client would
    await act(async () => {
      window.dispatchEvent(new CustomEvent("farm:org:stale"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });

    expect(orgsApi.list).toHaveBeenCalledTimes(2);
  });

  it("auto-selects first org when user has multiple orgs and no saved selection", async () => {
    vi.mocked(orgsApi.list).mockResolvedValue(mockOrgs as never);

    render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    // First org should be auto-selected even though there are 2 orgs
    expect(screen.getByTestId("current").textContent).toBe("org-1");
    expect(sessionStorage.getItem(ORG_STORAGE_KEY)).toBe("org-1");
  });

  it("falls back to first org when saved org is stale (duplicate coverage)", async () => {
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

    // Should fall back to org-1 (first available) instead of null
    expect(screen.getByTestId("current").textContent).toBe("org-1");
    expect(sessionStorage.getItem(ORG_STORAGE_KEY)).toBe("org-1");
  });

  it("isLoading is true immediately when isAuthenticated transitions to true, before the fetch resolves", async () => {
    // Hold the fetch in flight using a deferred promise so we can inspect
    // isLoading between the auth transition and the fetch completion.
    let resolveOrgs!: (v: typeof mockOrgs) => void;
    const deferred = new Promise<typeof mockOrgs>((res) => {
      resolveOrgs = res;
    });
    vi.mocked(orgsApi.list).mockReturnValueOnce(deferred as never);

    // Start unauthenticated.
    mockIsAuthenticated.value = false;
    const { rerender } = render(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    // While not authenticated, loading should settle to false.
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    // Transition to authenticated — the derived isLoading must be true in the
    // same render (hasFetchedForCurrentAuth is still false at this point).
    mockIsAuthenticated.value = true;
    rerender(
      <OrganizationProvider>
        <TestConsumer />
      </OrganizationProvider>,
    );

    // isLoading=true before the fetch resolves, preventing OrgReadyGate from
    // firing its redirect effect in the narrow window between auth and fetch.
    expect(screen.getByTestId("loading").textContent).toBe("true");

    // Resolving the deferred fetch must clear isLoading.
    await act(async () => {
      resolveOrgs(mockOrgs);
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("count").textContent).toBe("2");
  });
});
