import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AdvancedSearchModal } from "./advanced-search-modal";
import type { AdvancedSearchResult } from "@/types/api";

// ── Mock next/navigation ─────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── Mock api-client ──────────────────────────────────────────────────────────
vi.mock("@/lib/api-client", () => ({
  search: { quick: vi.fn(), advanced: vi.fn() },
}));

// ── Mock useFacetedSearch ────────────────────────────────────────────────────
const mockUseFacetedSearch = vi.fn();
vi.mock("@/hooks/use-faceted-search", () => ({
  useFacetedSearch: (...args: unknown[]) => mockUseFacetedSearch(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
const EMPTY_RESULT: AdvancedSearchResult = {
  hits: [],
  total: 0,
  page: 1,
  totalPages: 0,
  facets: { types: [], namespaces: [], tags: [] },
  source: "elasticsearch",
};

function makeHookState(overrides: Partial<ReturnType<typeof makeDefaultHookState>> = {}) {
  return { ...makeDefaultHookState(), ...overrides };
}

function makeDefaultHookState() {
  return {
    query: "",
    setQuery: vi.fn(),
    filters: { types: [], namespace: "", tags: [] },
    toggleType: vi.fn(),
    toggleTag: vi.fn(),
    setNamespace: vi.fn(),
    page: 1,
    setPage: vi.fn(),
    result: EMPTY_RESULT,
    isLoading: false,
    reset: vi.fn(),
  };
}

function makeResult(overrides: Partial<AdvancedSearchResult> = {}): AdvancedSearchResult {
  return {
    hits: [
      {
        id: "c-1",
        type: "component",
        name: "user-service",
        description: "A user microservice",
        namespace: "platform",
        tags: ["api"],
        url: "/catalog/c-1",
        score: 1.0,
      },
      {
        id: "t-1",
        type: "team",
        name: "platform-team",
        url: "/teams/t-1",
        score: 0.8,
      },
    ],
    total: 2,
    page: 1,
    totalPages: 2,
    facets: {
      types: [
        { key: "component", count: 1 },
        { key: "team", count: 1 },
      ],
      namespaces: [{ key: "platform", count: 1 }],
      tags: [{ key: "api", count: 1 }],
    },
    source: "elasticsearch",
    ...overrides,
  };
}

describe("AdvancedSearchModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    mockPush.mockClear();
    mockUseFacetedSearch.mockReturnValue(makeHookState());
  });

  it("does not render when closed", () => {
    const { container } = render(<AdvancedSearchModal open={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders search input and dialog when open", () => {
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Search query")).toBeTruthy();
  });

  it("calls onClose on Escape", () => {
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    fireEvent.keyDown(screen.getByLabelText("Search query"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    const backdrop = document.querySelector("[aria-hidden='true'].absolute") as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows loading state", () => {
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({ query: "us", isLoading: true, result: EMPTY_RESULT }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    expect(screen.getByText("Searching...")).toBeTruthy();
  });

  it("shows no-results message when hits is empty and query >= 2", () => {
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({ query: "zzz", isLoading: false, result: EMPTY_RESULT }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    expect(screen.getByText(/No results for/)).toBeTruthy();
  });

  it("renders result hits with name", () => {
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({ query: "service", isLoading: false, result: makeResult() }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    expect(screen.getByText("user-service")).toBeTruthy();
    expect(screen.getByText("platform-team")).toBeTruthy();
  });

  it("renders highlight: <em> markers rendered as <strong> via dangerouslySetInnerHTML", () => {
    const resultWithHighlight = makeResult({
      hits: [
        {
          id: "h-1",
          type: "component",
          name: "highlighted-service",
          url: "/catalog/h-1",
          score: 1.0,
          highlights: {
            name: ["<em>highlighted</em>-service"],
          },
        },
      ],
      total: 1,
      totalPages: 1,
    });
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({ query: "highlight", isLoading: false, result: resultWithHighlight }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    // The <em> should be replaced with <strong>
    const strongEl = document.querySelector("strong");
    expect(strongEl).toBeTruthy();
    expect(strongEl?.textContent).toBe("highlighted");
  });

  it("renders source badge when source is database", () => {
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({
        query: "service",
        result: makeResult({ source: "database" }),
      }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    expect(screen.getByText("Full-text search unavailable — showing basic results")).toBeTruthy();
  });

  it("toggles type facet when facet checkbox is clicked", () => {
    const toggleType = vi.fn();
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({
        query: "service",
        result: makeResult(),
        toggleType,
      }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    const componentCheckbox = screen.getByLabelText("Filter by type component");
    fireEvent.click(componentCheckbox);
    expect(toggleType).toHaveBeenCalledWith("component");
  });

  it("keyboard ArrowDown moves selection and Enter navigates", () => {
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({ query: "service", isLoading: false, result: makeResult() }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    const input = screen.getByLabelText("Search query");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/teams/t-1");
  });

  it("pagination buttons show when totalPages > 1", () => {
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({ query: "service", isLoading: false, result: makeResult() }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    expect(screen.getByText(/Page 1 of 2/)).toBeTruthy();
    expect(screen.getByLabelText("Previous page")).toBeTruthy();
    expect(screen.getByLabelText("Next page")).toBeTruthy();
  });

  it("Prev/Next pagination calls setPage", () => {
    const setPage = vi.fn();
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({
        query: "service",
        isLoading: false,
        result: makeResult(),
        page: 1,
        setPage,
      }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Next page"));
    expect(setPage).toHaveBeenCalledWith(2);

    // Prev is disabled on page 1 — no call expected for it
    fireEvent.click(screen.getByLabelText("Previous page"));
    // page 1 prev button is disabled, so setPage should not be called with 0
    expect(setPage).not.toHaveBeenCalledWith(0);
  });

  it("clicking a result item via button fires handleNavigate", () => {
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({ query: "service", isLoading: false, result: makeResult() }),
    );
    const { container } = render(<AdvancedSearchModal open={true} onClose={onClose} />);

    const resultsList = container.querySelector<HTMLUListElement>("#advanced-search-results");
    const firstBtn = resultsList?.querySelector<HTMLButtonElement>("button");
    if (firstBtn) {
      fireEvent.click(firstBtn);
      expect(mockPush).toHaveBeenCalledWith("/catalog/c-1");
    } else {
      throw new Error("No result buttons found — verify the results list renders");
    }
  });

  it("clicking a namespace facet button calls setNamespace", () => {
    const setNamespace = vi.fn();
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({
        query: "service",
        result: makeResult(),
        setNamespace,
      }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    const aside = screen.getByLabelText("Search filters");
    const nsBtn = within(aside).getByText("platform");
    fireEvent.click(nsBtn.closest("button") ?? nsBtn);
    expect(setNamespace).toHaveBeenCalled();
  });

  it("toggling a tag facet checkbox calls toggleTag", () => {
    const toggleTag = vi.fn();
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({
        query: "service",
        result: makeResult(),
        toggleTag,
      }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    const tagCheckbox = screen.getByLabelText("Filter by tag api");
    fireEvent.click(tagCheckbox);
    expect(toggleTag).toHaveBeenCalledWith("api");
  });

  it("Prev page button calls setPage when page > 1", () => {
    const setPage = vi.fn();
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({
        query: "service",
        isLoading: false,
        result: makeResult(),
        page: 2,
        setPage,
      }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Previous page"));
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it("typing in the search input calls setQuery", () => {
    const setQuery = vi.fn();
    mockUseFacetedSearch.mockReturnValue(
      makeHookState({ setQuery }),
    );
    render(<AdvancedSearchModal open={true} onClose={onClose} />);
    const input = screen.getByLabelText("Search query");
    fireEvent.change(input, { target: { value: "new-query" } });
    expect(setQuery).toHaveBeenCalledWith("new-query");
  });
});
