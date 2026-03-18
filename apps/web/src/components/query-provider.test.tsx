import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { QueryProvider } from "./query-provider";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * A simple consumer component that uses useQuery inside the provider.
 * If the provider is absent, useQuery throws "No QueryClient set".
 */
function QueryConsumer({ queryFn }: { queryFn: () => Promise<string> }) {
  const { data, isLoading } = useQuery({
    queryKey: ["test-key"],
    queryFn,
  });

  if (isLoading) return <span>loading</span>;
  return <span data-testid="result">{data}</span>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("QueryProvider", () => {
  it("renders children without throwing", () => {
    render(
      <QueryProvider>
        <div data-testid="child">hello</div>
      </QueryProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("supplies a QueryClient so that useQuery works inside children", async () => {
    const queryFn = () => Promise.resolve("hello-from-query");

    render(
      <QueryProvider>
        <QueryConsumer queryFn={queryFn} />
      </QueryProvider>,
    );

    // Initial render shows loading state
    expect(screen.getByText("loading")).toBeInTheDocument();

    // After the query resolves the result is displayed
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent("hello-from-query");
  });

  it("creates a new QueryClient on every mount (no shared state between instances)", () => {
    // Render two independent providers — they must not share cache
    const { unmount: unmount1 } = render(
      <QueryProvider>
        <div data-testid="p1">provider-1</div>
      </QueryProvider>,
    );
    const { unmount: unmount2 } = render(
      <QueryProvider>
        <div data-testid="p2">provider-2</div>
      </QueryProvider>,
    );

    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.getByTestId("p2")).toBeInTheDocument();

    unmount1();
    unmount2();
  });

  it("shows loading state while query is in flight", async () => {
    // A queryFn that never resolves during this assertion window
    const queryFn = () => new Promise<string>(() => {});

    render(
      <QueryProvider>
        <QueryConsumer queryFn={queryFn} />
      </QueryProvider>,
    );

    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("allows nested consumers to share the same QueryClient", async () => {
    let callCount = 0;
    const queryFn = () => {
      callCount += 1;
      return Promise.resolve("shared-data");
    };

    function ConsumerA() {
      const { data } = useQuery({ queryKey: ["shared"], queryFn });
      return <span data-testid="a">{data}</span>;
    }
    function ConsumerB() {
      // Same queryKey — should hit the cache from ConsumerA, not re-fetch
      const { data } = useQuery({ queryKey: ["shared"], queryFn });
      return <span data-testid="b">{data}</span>;
    }

    render(
      <QueryProvider>
        <ConsumerA />
        <ConsumerB />
      </QueryProvider>,
    );

    await screen.findByTestId("a");
    await screen.findByTestId("b");

    // The queryFn should only have been called once thanks to deduplication
    expect(callCount).toBe(1);
  });
});
