import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFacetedSearch } from "./use-faceted-search";
import type { AdvancedSearchResult } from "@/types/api";

const mockAdvanced = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({
  search: { quick: vi.fn(), advanced: mockAdvanced },
}));

const makeResult = (overrides: Partial<AdvancedSearchResult> = {}): AdvancedSearchResult => ({
  hits: [
    {
      id: "c-1",
      type: "component",
      name: "user-service",
      url: "/catalog/c-1",
      score: 1.0,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
  facets: {
    types: [{ key: "component", count: 1 }],
    namespaces: [],
    tags: [],
  },
  source: "elasticsearch",
  ...overrides,
});

const EMPTY_RESULT: AdvancedSearchResult = {
  hits: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  facets: { types: [], namespaces: [], tags: [] },
  source: "elasticsearch",
};

describe("useFacetedSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockAdvanced.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty result initially", () => {
    const { result } = renderHook(() => useFacetedSearch(true));
    expect(result.current.query).toBe("");
    expect(result.current.result).toEqual(EMPTY_RESULT);
    expect(result.current.isLoading).toBe(false);
  });

  it("does not search when query is shorter than 2 chars", async () => {
    const { result } = renderHook(() => useFacetedSearch(true));

    act(() => {
      result.current.setQuery("a");
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(mockAdvanced).not.toHaveBeenCalled();
    expect(result.current.result).toEqual(EMPTY_RESULT);
  });

  it("calls advancedSearch after 300ms debounce when query >= 2 chars", async () => {
    mockAdvanced.mockResolvedValue(makeResult());
    const { result } = renderHook(() => useFacetedSearch(true));

    act(() => {
      result.current.setQuery("us");
    });

    // Before debounce fires
    expect(mockAdvanced).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockAdvanced).toHaveBeenCalledWith(
      expect.objectContaining({ q: "us" }),
    );
  });

  it("re-triggers search when a type facet is toggled", async () => {
    mockAdvanced.mockResolvedValue(makeResult());
    const { result } = renderHook(() => useFacetedSearch(true));

    // First set a valid query
    act(() => {
      result.current.setQuery("service");
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    const callsBefore = mockAdvanced.mock.calls.length;

    act(() => {
      result.current.toggleType("component");
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockAdvanced.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastCall = mockAdvanced.mock.calls[mockAdvanced.mock.calls.length - 1]![0];
    expect(lastCall.types).toContain("component");
  });

  it("re-triggers search when a tag facet is toggled", async () => {
    mockAdvanced.mockResolvedValue(makeResult());
    const { result } = renderHook(() => useFacetedSearch(true));

    act(() => {
      result.current.setQuery("service");
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    const callsBefore = mockAdvanced.mock.calls.length;

    act(() => {
      result.current.toggleTag("production");
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockAdvanced.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastCall = mockAdvanced.mock.calls[mockAdvanced.mock.calls.length - 1]![0];
    expect(lastCall.tags).toContain("production");
  });

  it("resets to page 1 when query changes", async () => {
    mockAdvanced.mockResolvedValue(makeResult());
    const { result } = renderHook(() => useFacetedSearch(true));

    // Advance to page 2
    act(() => {
      result.current.setPage(2);
    });

    // Change query — should reset page to 1
    act(() => {
      result.current.setQuery("new-query");
    });

    expect(result.current.page).toBe(1);
  });

  it("handles API error gracefully — returns empty result", async () => {
    mockAdvanced.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useFacetedSearch(true));

    act(() => {
      result.current.setQuery("failing");
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve(); // flush rejection + finally
    });

    expect(result.current.result).toEqual(EMPTY_RESULT);
    expect(result.current.isLoading).toBe(false);
  });

  it("reset() clears query, filters, and result", async () => {
    mockAdvanced.mockResolvedValue(makeResult());
    const { result } = renderHook(() => useFacetedSearch(true));

    act(() => {
      result.current.setQuery("service");
      result.current.toggleType("component");
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.query).toBe("");
    expect(result.current.filters.types).toEqual([]);
    expect(result.current.result).toEqual(EMPTY_RESULT);
  });
});
