import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockStats = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  componentElasticsearchIndices: {
    stats: mockStats,
  },
}));

import { useElasticsearchIndices } from "./use-elasticsearch-indices";

const SAMPLE = [
  {
    indexId: "idx-1",
    indexPattern: "logs-app-*",
    esUrl: null,
    reachable: true,
    stats: {
      pattern: "logs-app-*",
      index: "logs-app-2024.01.01",
      health: "green" as const,
      status: "open",
      docsCount: 1234,
      storeSize: "12.3kb",
    },
  },
];

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

/** Flush any microtasks queued by resolved promises. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useElasticsearchIndices", () => {
  beforeEach(() => {
    mockStats.mockReset();
    setVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("populates indices on initial fetch", async () => {
    mockStats.mockResolvedValue(SAMPLE);

    const { result } = renderHook(() => useElasticsearchIndices("comp-1"));

    expect(result.current.loading).toBe(true);

    await flush();
    expect(result.current.loading).toBe(false);
    expect(result.current.indices).toEqual(SAMPLE);
    expect(result.current.error).toBeNull();
    expect(mockStats).toHaveBeenCalledWith("comp-1");
  });

  it("surfaces fetch errors", async () => {
    mockStats.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useElasticsearchIndices("comp-1"));

    await flush();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.indices).toEqual([]);
  });

  it("re-invokes the API when refetch() is called", async () => {
    mockStats.mockResolvedValue(SAMPLE);

    const { result } = renderHook(() => useElasticsearchIndices("comp-1"));
    await flush();
    expect(mockStats).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockStats).toHaveBeenCalledTimes(2);
  });

  it("does not poll while the tab is hidden", async () => {
    mockStats.mockResolvedValue(SAMPLE);
    setVisibility("hidden");

    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    renderHook(() => useElasticsearchIndices("comp-1"));

    // Initial fetch still runs once unconditionally.
    await flush();
    expect(mockStats).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(90_000); // three poll intervals
    });
    await flush();

    // No extra calls — interval was never started while hidden.
    expect(mockStats).toHaveBeenCalledTimes(1);
  });

  it("polls every 30s while the tab is visible", async () => {
    mockStats.mockResolvedValue(SAMPLE);

    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    renderHook(() => useElasticsearchIndices("comp-1"));
    await flush();
    expect(mockStats).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await flush();
    expect(mockStats).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await flush();
    expect(mockStats).toHaveBeenCalledTimes(3);
  });

  it("immediately refetches when the tab becomes visible again", async () => {
    mockStats.mockResolvedValue(SAMPLE);

    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    renderHook(() => useElasticsearchIndices("comp-1"));
    await flush();
    expect(mockStats).toHaveBeenCalledTimes(1);

    setVisibility("hidden");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    await flush();
    expect(mockStats).toHaveBeenCalledTimes(1);

    setVisibility("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();

    expect(mockStats).toHaveBeenCalledTimes(2);
  });
});
