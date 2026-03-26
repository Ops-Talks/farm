import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks — must be declared before the component import so vi.mock hoisting
// can intercept the module.
// ---------------------------------------------------------------------------
const mockGetLogs = vi.fn();

vi.mock("@/lib/api-client", () => ({
  observability: {
    getLogs: (...args: unknown[]) => mockGetLogs(...args),
  },
}));

import { LogsTab } from "@/app/(protected)/observability/_components/logs-tab";
import type { LokiLogsResponse } from "@/types/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a successful Loki query response from a list of stream descriptors.
 * Each descriptor carries an optional stream label map and the list of
 * [nanosecond-timestamp, message] value pairs.
 */
function makeLogsResponse(
  streams: Array<{ stream?: Record<string, string>; values: [string, string][] }>
): LokiLogsResponse {
  return {
    status: "success",
    data: {
      resultType: "streams",
      result: streams.map((s) => ({ stream: s.stream ?? {}, values: s.values })),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LogsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Initial render --------------------------------------------------------

  it("shows the 'Enter a LogQL query' prompt before any query is run", () => {
    render(<LogsTab />);
    expect(
      screen.getByText("Enter a LogQL query and press Run Query")
    ).toBeInTheDocument();
  });

  // 2. Time range buttons ----------------------------------------------------

  it("renders all four time range buttons", () => {
    render(<LogsTab />);
    for (const label of ["15m", "1h", "3h", "24h"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("clicking a time range button applies the selected range to the API call", async () => {
    mockGetLogs.mockResolvedValue(makeLogsResponse([]));
    const user = userEvent.setup();
    render(<LogsTab />);

    // Switch from the default 1h range to 24h.
    await user.click(screen.getByRole("button", { name: "24h" }));
    await user.click(screen.getByRole("button", { name: "Run Query" }));

    await waitFor(() => expect(mockGetLogs).toHaveBeenCalledOnce());

    const [[callArgs]] = mockGetLogs.mock.calls as [
      [{ query: string; start: number; end: number; limit: number; direction: string }],
      ...unknown[]
    ][];
    // 24h = 86 400 seconds; end - start must match exactly.
    expect(callArgs.end - callArgs.start).toBe(86400);
  });

  it("clicking every time range button does not throw", async () => {
    const user = userEvent.setup();
    render(<LogsTab />);

    for (const label of ["15m", "3h", "1h"]) {
      await user.click(screen.getByRole("button", { name: label }));
    }
    // No assertion needed — absence of thrown errors is the contract.
  });

  // 3. Loading state ---------------------------------------------------------

  it("shows a loading state while the query is in flight", async () => {
    // Return a promise that never resolves so the loading state persists.
    mockGetLogs.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<LogsTab />);

    await user.click(screen.getByRole("button", { name: "Run Query" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Loading…" })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
  });

  // 4. Successful query with log lines ---------------------------------------

  it("displays log lines and the line counter after a successful query", async () => {
    mockGetLogs.mockResolvedValue(
      makeLogsResponse([
        { values: [["1700000000000000000", "info: server started"]] },
      ])
    );
    const user = userEvent.setup();
    render(<LogsTab />);

    await user.click(screen.getByRole("button", { name: "Run Query" }));

    await waitFor(() =>
      expect(screen.getByText("info: server started")).toBeInTheDocument()
    );
    expect(screen.getByText("Showing 1 of 1 lines")).toBeInTheDocument();
  });

  // 5. Empty results ---------------------------------------------------------

  it("shows the 'No log lines found' empty state when the query returns no lines", async () => {
    mockGetLogs.mockResolvedValue(makeLogsResponse([]));
    const user = userEvent.setup();
    render(<LogsTab />);

    await user.click(screen.getByRole("button", { name: "Run Query" }));

    await waitFor(() =>
      expect(screen.getByText("No log lines found")).toBeInTheDocument()
    );
  });

  // 6. Response with status: "error" -----------------------------------------

  it("shows 'Loki not available' when the response status is 'error'", async () => {
    mockGetLogs.mockResolvedValue({ status: "error" } as LokiLogsResponse);
    const user = userEvent.setup();
    render(<LogsTab />);

    await user.click(screen.getByRole("button", { name: "Run Query" }));

    await waitFor(() =>
      expect(screen.getByText("Loki not available")).toBeInTheDocument()
    );
  });

  // 7. Response with no data property ----------------------------------------

  it("shows 'Loki not available' when the response carries no data property", async () => {
    mockGetLogs.mockResolvedValue({ status: "success" } as LokiLogsResponse);
    const user = userEvent.setup();
    render(<LogsTab />);

    await user.click(screen.getByRole("button", { name: "Run Query" }));

    await waitFor(() =>
      expect(screen.getByText("Loki not available")).toBeInTheDocument()
    );
  });

  // 8. API throws an exception -----------------------------------------------

  it("shows 'Loki not available' when the API call throws an exception", async () => {
    mockGetLogs.mockRejectedValue(new globalThis.Error("Network error"));
    const user = userEvent.setup();
    render(<LogsTab />);

    await user.click(screen.getByRole("button", { name: "Run Query" }));

    await waitFor(() =>
      expect(screen.getByText("Loki not available")).toBeInTheDocument()
    );
  });

  // 9. Load more button ------------------------------------------------------

  it("renders 'Load more' when results exceed 200 lines and increases visible count on click", async () => {
    // Generate 201 entries so the first render shows 200 and the button is visible.
    const manyValues: [string, string][] = Array.from(
      { length: 201 },
      (_, i) => [String(i + 1), `log line ${i}`]
    );
    mockGetLogs.mockResolvedValue(makeLogsResponse([{ values: manyValues }]));
    const user = userEvent.setup();
    render(<LogsTab />);

    await user.click(screen.getByRole("button", { name: "Run Query" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Load more/ })).toBeInTheDocument()
    );
    expect(screen.getByText("Showing 200 of 201 lines")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Load more/ }));

    await waitFor(() =>
      expect(screen.getByText("Showing 201 of 201 lines")).toBeInTheDocument()
    );
    expect(
      screen.queryByRole("button", { name: /Load more/ })
    ).not.toBeInTheDocument();
  });

  // 10. Enter key triggers runQuery ------------------------------------------

  it("pressing Enter in the query input triggers a query execution", async () => {
    mockGetLogs.mockResolvedValue(makeLogsResponse([]));
    const user = userEvent.setup();
    render(<LogsTab />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{Enter}");

    await waitFor(() => expect(mockGetLogs).toHaveBeenCalledOnce());
  });

  // 11. Log level badge variants (covers all detectLevel branches) -----------

  describe("log level detection", () => {
    /**
     * Renders LogsTab with a single log line carrying the given message,
     * runs the query, and waits until the message is visible.
     */
    async function renderSingleLine(message: string): Promise<void> {
      vi.clearAllMocks();
      mockGetLogs.mockResolvedValue(
        makeLogsResponse([{ values: [["1000000000", message]] }])
      );
      const user = userEvent.setup();
      render(<LogsTab />);
      await user.click(screen.getByRole("button", { name: "Run Query" }));
      await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
    }

    it("renders the 'error' badge for messages containing the word 'error'", async () => {
      await renderSingleLine("connection error occurred");
      expect(screen.getByText("error")).toBeInTheDocument();
    });

    it("renders the 'warn' badge for messages containing the word 'warn'", async () => {
      await renderSingleLine("warn: disk space is low");
      expect(screen.getByText("warn")).toBeInTheDocument();
    });

    it("renders the 'debug' badge for messages containing the word 'debug'", async () => {
      await renderSingleLine("debug: entering processRequest");
      expect(screen.getByText("debug")).toBeInTheDocument();
    });

    it("renders the 'info' badge for messages containing the word 'info'", async () => {
      await renderSingleLine("info: application started");
      expect(screen.getByText("info")).toBeInTheDocument();
    });

    it("renders the 'unknown' badge when no level keyword is matched", async () => {
      await renderSingleLine("hello world");
      expect(screen.getByText("unknown")).toBeInTheDocument();
    });
  });

  // 12. formatNanoTs branches ------------------------------------------------

  describe("timestamp formatting (formatNanoTs)", () => {
    it("formats a valid nanosecond timestamp instead of showing the raw string", async () => {
      // 1 700 000 000 000 000 000 ns → 1 700 000 000 000 ms (a real date/time).
      mockGetLogs.mockResolvedValue(
        makeLogsResponse([
          { values: [["1700000000000000000", "info: timestamp valid"]] },
        ])
      );
      const user = userEvent.setup();
      render(<LogsTab />);
      await user.click(screen.getByRole("button", { name: "Run Query" }));
      await waitFor(() =>
        expect(screen.getByText("info: timestamp valid")).toBeInTheDocument()
      );
      // The raw nanosecond string must NOT appear; it was converted to a time.
      expect(screen.queryByText("1700000000000000000")).not.toBeInTheDocument();
    });

    it("falls back to the first 10 characters when the timestamp cannot be parsed", async () => {
      // BigInt("not-a-number") throws a SyntaxError.
      // With a single-element array, Array.sort never calls the comparator,
      // so parseStreams does not throw.  formatNanoTs catches the error and
      // returns ns.slice(0, 10) = "not-a-numb".
      mockGetLogs.mockResolvedValue(
        makeLogsResponse([{ values: [["not-a-number", "info: bad timestamp"]] }])
      );
      const user = userEvent.setup();
      render(<LogsTab />);
      await user.click(screen.getByRole("button", { name: "Run Query" }));
      await waitFor(() =>
        expect(screen.getByText("info: bad timestamp")).toBeInTheDocument()
      );
      expect(screen.getByText("not-a-numb")).toBeInTheDocument();
    });
  });
});
