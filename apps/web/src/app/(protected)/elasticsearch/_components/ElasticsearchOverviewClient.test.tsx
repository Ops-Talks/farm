import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks (must come before component import)
// ---------------------------------------------------------------------------

const mockList = vi.hoisted(() => vi.fn());
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

vi.mock("@/lib/api-client", () => ({
  elasticsearchIndicesOverview: {
    list: (...args: unknown[]) => mockList(...args),
  },
  ApiError: FakeApiError,
}));

vi.mock("@/lib/kibana-config", () => ({
  getKibanaUrl: () => mockGetKibanaUrl(),
  buildKibanaDiscoverUrl: (pattern: string) => mockBuildKibana(pattern),
}));

import { ElasticsearchOverviewClient } from "./ElasticsearchOverviewClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeData() {
  return [
    {
      componentId: "alpha-id",
      componentName: "alpha",
      indices: [
        {
          indexId: "a1",
          indexPattern: "alpha-app-*",
          esUrl: null,
          reachable: true,
          stats: {
            pattern: "alpha-app-*",
            index: "alpha-app-2024.01.01",
            health: "green" as const,
            status: "open",
            docsCount: 1234,
            storeSize: "1.2kb",
          },
        },
        {
          indexId: "a2",
          indexPattern: "alpha-audit-*",
          esUrl: null,
          reachable: true,
          stats: {
            pattern: "alpha-audit-*",
            index: "alpha-audit-2024.01.01",
            health: "red" as const,
            status: "open",
            docsCount: 5678,
            storeSize: "5.6kb",
          },
        },
      ],
    },
    {
      componentId: "bravo-id",
      componentName: "bravo",
      indices: [
        {
          indexId: "b1",
          indexPattern: "bravo-app-*",
          esUrl: null,
          reachable: true,
          stats: {
            pattern: "bravo-app-*",
            index: "bravo-app-2024.01.01",
            health: "yellow" as const,
            status: "open",
            docsCount: 999,
            storeSize: "0.9kb",
          },
        },
        {
          indexId: "b2",
          indexPattern: "bravo-down-*",
          esUrl: null,
          reachable: false,
        },
      ],
    },
  ];
}

beforeEach(() => {
  mockList.mockReset();
  mockGetKibanaUrl.mockReset().mockReturnValue(undefined);
  mockBuildKibana.mockReset().mockReturnValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ElasticsearchOverviewClient (FARM-S354 / FARM-T406)", () => {
  it("renders rows from two components × two indices each in the order returned", async () => {
    mockList.mockResolvedValue(makeData());
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getAllByTestId("es-overview-row")).toHaveLength(4);
    });

    const rows = screen.getAllByTestId("es-overview-row");
    expect(within(rows[0]).getByText("alpha-app-*")).toBeInTheDocument();
    expect(within(rows[1]).getByText("alpha-audit-*")).toBeInTheDocument();
    expect(within(rows[2]).getByText("bravo-app-*")).toBeInTheDocument();
    expect(within(rows[3]).getByText("bravo-down-*")).toBeInTheDocument();

    // Doc-count formatting via Intl.NumberFormat("en-US")
    expect(within(rows[0]).getByText("1,234")).toBeInTheDocument();
    expect(within(rows[1]).getByText("5,678")).toBeInTheDocument();
  });

  it("renders the component chip as a Link to /catalog/<componentId>", async () => {
    mockList.mockResolvedValue(makeData());
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getAllByTestId("es-overview-row")).toHaveLength(4);
    });

    const rows = screen.getAllByTestId("es-overview-row");
    const alphaLink = within(rows[0]).getByRole("link", { name: "alpha" });
    expect(alphaLink).toHaveAttribute("href", "/catalog/alpha-id");
    const bravoLink = within(rows[2]).getByRole("link", { name: "bravo" });
    expect(bravoLink).toHaveAttribute("href", "/catalog/bravo-id");
  });

  it("filter chip 'Red' narrows to only red entries; filtered docs disappear", async () => {
    mockList.mockResolvedValue(makeData());
    const user = userEvent.setup();
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getAllByTestId("es-overview-row")).toHaveLength(4);
    });

    await user.click(screen.getByRole("button", { name: "Red" }));

    const rows = screen.getAllByTestId("es-overview-row");
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText("alpha-audit-*")).toBeInTheDocument();

    // Doc count for the filtered-out green row must be gone.
    expect(screen.queryByText("1,234")).not.toBeInTheDocument();
    expect(screen.queryByText("999")).not.toBeInTheDocument();
    expect(screen.getByText("5,678")).toBeInTheDocument();

    // aria-pressed reflects active state.
    expect(screen.getByRole("button", { name: "Red" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("clicking 'All' after a Red filter restores every row", async () => {
    mockList.mockResolvedValue(makeData());
    const user = userEvent.setup();
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getAllByTestId("es-overview-row")).toHaveLength(4);
    });

    await user.click(screen.getByRole("button", { name: "Red" }));
    expect(screen.getAllByTestId("es-overview-row")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getAllByTestId("es-overview-row")).toHaveLength(4);
  });

  it("does not render any Kibana link when getKibanaUrl() is undefined", async () => {
    mockGetKibanaUrl.mockReturnValue(undefined);
    mockBuildKibana.mockReturnValue(undefined);
    mockList.mockResolvedValue(makeData());
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getAllByTestId("es-overview-row")).toHaveLength(4);
    });

    expect(screen.queryByRole("link", { name: /kibana/i })).toBeNull();
  });

  it("renders a Kibana link per row when getKibanaUrl() returns a URL", async () => {
    mockGetKibanaUrl.mockReturnValue("https://kibana.test");
    mockBuildKibana.mockImplementation(
      (pattern) =>
        `https://kibana.test/app/discover#/?_a=(index:'${encodeURIComponent(pattern)}')`,
    );
    mockList.mockResolvedValue(makeData());
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getAllByTestId("es-overview-row")).toHaveLength(4);
    });

    const links = screen.getAllByRole("link", { name: /kibana/i });
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute(
      "href",
      "https://kibana.test/app/discover#/?_a=(index:'alpha-app-*')",
    );
  });

  it("renders the empty-state CTA when backend returns an empty list", async () => {
    mockList.mockResolvedValue([]);
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getByText(/No indices linked/i)).toBeInTheDocument();
    });

    const cta = screen.getByRole("link", { name: /browse catalog/i });
    expect(cta).toHaveAttribute("href", "/catalog");
  });

  it("renders 'No indices match this filter.' when filter excludes everything", async () => {
    // All-green dataset; user picks Red → zero matches.
    mockList.mockResolvedValue([
      {
        componentId: "alpha-id",
        componentName: "alpha",
        indices: [
          {
            indexId: "a1",
            indexPattern: "alpha-app-*",
            esUrl: null,
            reachable: true,
            stats: {
              pattern: "alpha-app-*",
              index: "alpha-app-2024.01.01",
              health: "green" as const,
              status: "open",
              docsCount: 1,
              storeSize: "1b",
            },
          },
        ],
      },
    ]);
    const user = userEvent.setup();
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getAllByTestId("es-overview-row")).toHaveLength(1);
    });

    await user.click(screen.getByRole("button", { name: "Red" }));

    expect(
      screen.getByText(/No indices match this filter\./i),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId("es-overview-row")).toHaveLength(0);
  });

  it("renders the Forbidden state when the backend returns 403", async () => {
    mockList.mockRejectedValue(new FakeApiError(403, { message: "forbidden" }));
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(
        screen.getByText(/Forbidden — admin access required/i),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Failed to load/i)).toBeNull();
  });

  it("renders an error state when list rejects with a generic Error", async () => {
    mockList.mockRejectedValue(new Error("backend boom"));
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/backend boom/i);
    });
  });

  it("renders a default error message when list rejects with a non-Error", async () => {
    mockList.mockRejectedValue("nope");
    render(<ElasticsearchOverviewClient />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /failed to load elasticsearch indices/i,
      );
    });
  });
});
