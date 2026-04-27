import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks (must come before component import)
// ---------------------------------------------------------------------------

const mockUseHook = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockRemove = vi.hoisted(() => vi.fn());
const mockGetKibanaUrl = vi.hoisted(() =>
  vi.fn<() => string | undefined>(() => undefined),
);
const mockBuildKibana = vi.hoisted(() =>
  vi.fn<(p: string) => string | undefined>(() => undefined),
);
const FakeApiError = vi.hoisted(() => {
  return class FakeApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown = {}) {
      super("api error");
      this.status = status;
      this.body = body;
    }
  };
});

vi.mock("@/hooks/use-elasticsearch-indices", () => ({
  useElasticsearchIndices: (...args: unknown[]) => mockUseHook(...args),
}));

vi.mock("@/lib/api-client", () => ({
  componentElasticsearchIndices: {
    create: (...args: unknown[]) => mockCreate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
  ApiError: FakeApiError,
}));

vi.mock("@/lib/kibana-config", () => ({
  getKibanaUrl: () => mockGetKibanaUrl(),
  buildKibanaDiscoverUrl: (pattern: string) => mockBuildKibana(pattern),
}));

import { ElasticsearchIndicesTab } from "./ElasticsearchIndicesTab";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockRow {
  indexId: string;
  indexPattern: string;
  esUrl: string | null;
  reachable: boolean;
  stats?: {
    pattern: string;
    index: string;
    health: "green" | "yellow" | "red" | "unknown";
    status: string;
    docsCount: number;
    storeSize: string;
  };
}

function row(overrides: Partial<MockRow> = {}): MockRow {
  return {
    indexId: "idx-1",
    indexPattern: "logs-app-*",
    esUrl: null,
    reachable: true,
    stats: {
      pattern: "logs-app-*",
      index: "logs-app-2024.01.01",
      health: "green",
      status: "open",
      docsCount: 12345,
      storeSize: "12.3kb",
    },
    ...overrides,
  };
}

const refetch = vi.fn().mockResolvedValue(undefined);

function setHook(state: {
  indices?: MockRow[];
  loading?: boolean;
  error?: Error | null;
}) {
  mockUseHook.mockReturnValue({
    indices: state.indices ?? [],
    loading: state.loading ?? false,
    error: state.error ?? null,
    refetch,
  });
}

beforeEach(() => {
  mockUseHook.mockReset();
  mockCreate.mockReset();
  mockRemove.mockReset();
  refetch.mockClear();
  mockGetKibanaUrl.mockReset().mockReturnValue(undefined);
  mockBuildKibana.mockReset().mockReturnValue(undefined);
});

describe("ElasticsearchIndicesTab", () => {
  describe("FARM-ST414 — health badges", () => {
    it("renders a red badge for health=red", () => {
      setHook({
        indices: [
          row({
            indexId: "r",
            indexPattern: "red-*",
            stats: {
              pattern: "red-*",
              index: "red-1",
              health: "red",
              status: "open",
              docsCount: 0,
              storeSize: "0b",
            },
          }),
        ],
      });
      render(<ElasticsearchIndicesTab componentId="c-1" />);
      const badge = screen.getByTestId("es-health-badge");
      expect(badge).toHaveAttribute("data-health", "red");
      expect(badge).toHaveAttribute("aria-label", expect.stringMatching(/critical/i));
    });

    it("renders a green badge for health=green", () => {
      setHook({ indices: [row({ indexId: "g", indexPattern: "green-*" })] });
      render(<ElasticsearchIndicesTab componentId="c-1" />);
      const badge = screen.getByTestId("es-health-badge");
      expect(badge).toHaveAttribute("data-health", "green");
      expect(badge).toHaveAttribute("aria-label", expect.stringMatching(/healthy/i));
    });

    it("renders a grey badge for health=unknown", () => {
      setHook({
        indices: [
          row({
            indexId: "u",
            indexPattern: "unknown-*",
            stats: {
              pattern: "unknown-*",
              index: "unknown-1",
              health: "unknown",
              status: "open",
              docsCount: 0,
              storeSize: "0b",
            },
          }),
        ],
      });
      render(<ElasticsearchIndicesTab componentId="c-1" />);
      const badge = screen.getByTestId("es-health-badge");
      expect(badge).toHaveAttribute("data-health", "unknown");
      expect(badge).toHaveAttribute("aria-label", expect.stringMatching(/unknown/i));
    });

    it("renders unreachable when reachable=false", () => {
      setHook({
        indices: [
          row({
            indexId: "x",
            indexPattern: "down-*",
            reachable: false,
            stats: undefined,
          }),
        ],
      });
      render(<ElasticsearchIndicesTab componentId="c-1" />);
      const badge = screen.getByTestId("es-health-badge");
      expect(badge).toHaveAttribute("data-health", "unreachable");
    });
  });

  describe("FARM-ST415 — Kibana link visibility", () => {
    it("does not render the Kibana link when NEXT_PUBLIC_KIBANA_URL is unset", () => {
      mockBuildKibana.mockReturnValue(undefined);
      setHook({ indices: [row()] });
      render(<ElasticsearchIndicesTab componentId="c-1" />);
      expect(
        screen.queryByRole("link", { name: /kibana/i }),
      ).toBeNull();
    });

    it("renders the Kibana link when configured", () => {
      mockBuildKibana.mockImplementation(
        (pattern) =>
          `https://kibana.example.com/app/discover#/?_a=(index:'${encodeURIComponent(pattern)}')`,
      );
      setHook({ indices: [row()] });
      render(<ElasticsearchIndicesTab componentId="c-1" />);
      const link = screen.getByRole("link", { name: /kibana/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
      expect(link.getAttribute("href")).toContain("logs-app-");
    });
  });

  it("formats doc counts with en-US thousand separators", () => {
    setHook({ indices: [row()] });
    render(<ElasticsearchIndicesTab componentId="c-1" />);
    expect(screen.getByText("12,345")).toBeInTheDocument();
  });

  it("renders the empty state with a Link Index CTA", () => {
    setHook({ indices: [] });
    render(<ElasticsearchIndicesTab componentId="c-1" />);
    expect(
      screen.getByText(/no elasticsearch indices linked/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /link index/i }).length,
    ).toBeGreaterThan(0);
  });

  it("renders an error state with a working retry button", async () => {
    setHook({ error: new Error("kapow") });
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/kapow/);
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("opens dialog, submits, closes, and refetches on success", async () => {
    setHook({ indices: [row()] });
    mockCreate.mockResolvedValue({});
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getAllByRole("button", { name: /link index/i })[0]);
    const patternInput = await screen.findByLabelText(/index pattern/i);
    await user.type(patternInput, "metrics-*");
    await user.click(screen.getByRole("button", { name: /^link$/i }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith("c-1", {
        indexPattern: "metrics-*",
        esUrl: undefined,
        description: undefined,
      }),
    );
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByLabelText(/index pattern/i)).not.toBeInTheDocument(),
    );
  });

  it("surfaces inline duplicate error on 409", async () => {
    setHook({ indices: [row()] });
    mockCreate.mockRejectedValue(new FakeApiError(409, { message: "dup" }));
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getAllByRole("button", { name: /link index/i })[0]);
    await user.type(await screen.findByLabelText(/index pattern/i), "logs-app-*");
    await user.click(screen.getByRole("button", { name: /^link$/i }));

    expect(
      await screen.findByText(/already linked to this component/i),
    ).toBeInTheDocument();
    expect(refetch).not.toHaveBeenCalled();
  });

  it("validates that esUrl must be a valid URL", async () => {
    setHook({ indices: [] });
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getAllByRole("button", { name: /link index/i })[0]);
    await user.type(await screen.findByLabelText(/index pattern/i), "logs-*");
    await user.type(screen.getByLabelText(/elasticsearch url/i), "not a url");
    await user.click(screen.getByRole("button", { name: /^link$/i }));

    expect(await screen.findByText(/valid url/i)).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("deletes a row and refetches", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    setHook({ indices: [row()] });
    mockRemove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getByRole("button", { name: /unlink logs-app-\*/i }));

    await waitFor(() =>
      expect(mockRemove).toHaveBeenCalledWith("c-1", "idx-1"),
    );
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });

  it("does not delete when the user cancels the confirm dialog", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    setHook({ indices: [row()] });
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getByRole("button", { name: /unlink logs-app-\*/i }));

    expect(mockRemove).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("renders the loading skeleton on first load", () => {
    setHook({ indices: [], loading: true });
    render(<ElasticsearchIndicesTab componentId="c-1" />);
    expect(screen.getByTestId("es-loading")).toBeInTheDocument();
  });

  it("surfaces a generic error message when create throws a non-ApiError", async () => {
    setHook({ indices: [row()] });
    mockCreate.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getAllByRole("button", { name: /link index/i })[0]);
    await user.type(await screen.findByLabelText(/index pattern/i), "logs-*");
    await user.click(screen.getByRole("button", { name: /^link$/i }));

    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
    expect(refetch).not.toHaveBeenCalled();
  });

  it("falls back to a default message when create throws a non-Error value", async () => {
    setHook({ indices: [row()] });
    mockCreate.mockRejectedValue("oops");
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getAllByRole("button", { name: /link index/i })[0]);
    await user.type(await screen.findByLabelText(/index pattern/i), "logs-*");
    await user.click(screen.getByRole("button", { name: /^link$/i }));

    expect(
      await screen.findByText(/failed to link index/i),
    ).toBeInTheDocument();
  });

  it("requires a non-empty index pattern", async () => {
    setHook({ indices: [row()] });
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getAllByRole("button", { name: /link index/i })[0]);
    await user.type(await screen.findByLabelText(/index pattern/i), "   ");
    await user.click(screen.getByRole("button", { name: /^link$/i }));

    expect(
      await screen.findByText(/index pattern is required/i),
    ).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("forwards optional esUrl and description on submit", async () => {
    setHook({ indices: [row()] });
    mockCreate.mockResolvedValue({});
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getAllByRole("button", { name: /link index/i })[0]);
    await user.type(await screen.findByLabelText(/index pattern/i), "metrics-*");
    await user.type(
      screen.getByLabelText(/elasticsearch url/i),
      "https://es.example.com:9200",
    );
    await user.type(screen.getByLabelText(/description/i), "App metrics");
    await user.click(screen.getByRole("button", { name: /^link$/i }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith("c-1", {
        indexPattern: "metrics-*",
        esUrl: "https://es.example.com:9200",
        description: "App metrics",
      }),
    );
  });

  it("closes the dialog and resets state when Cancel is clicked", async () => {
    setHook({ indices: [row()] });
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    await user.click(screen.getAllByRole("button", { name: /link index/i })[0]);
    await user.type(await screen.findByLabelText(/index pattern/i), "abc");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() =>
      expect(screen.queryByLabelText(/index pattern/i)).not.toBeInTheDocument(),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("opens the dialog from the empty-state Link Index CTA", async () => {
    setHook({ indices: [] });
    const user = userEvent.setup();
    render(<ElasticsearchIndicesTab componentId="c-1" />);

    const ctas = screen.getAllByRole("button", { name: /link index/i });
    // The empty-state CTA is the second button (header has the first).
    await user.click(ctas[ctas.length - 1]);

    expect(await screen.findByLabelText(/index pattern/i)).toBeInTheDocument();
  });
});
