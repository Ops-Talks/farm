import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchModal } from "./search-modal";
import type { QuickSearchResult } from "@/types/api";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

// Dynamic mock — individual tests control the returned state via mockUseQuery.
const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const defaultQueryState = { data: undefined, isFetching: false };

const makeResults = (): QuickSearchResult[] => [
  {
    type: "component",
    id: "c-1",
    title: "user-service",
    subtitle: "A user service",
    href: "/catalog/c-1",
  },
  {
    type: "team",
    id: "t-1",
    title: "platform team",
    subtitle: "Platform team",
    href: "/teams/t-1",
  },
  {
    type: "unknown-type" as QuickSearchResult["type"],
    id: "x-1",
    title: "Misc",
    subtitle: "",
    href: "/misc/x-1",
  },
];

describe("SearchModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    mockPush.mockClear();
    mockUseQuery.mockReturnValue(defaultQueryState);
  });

  it("does not render when closed", () => {
    const { container } = render(<SearchModal open={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders search input when open", () => {
    render(<SearchModal open={true} onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Search query")).toBeTruthy();
  });

  it("calls onClose when Escape is pressed", () => {
    render(<SearchModal open={true} onClose={onClose} />);
    fireEvent.keyDown(screen.getByLabelText("Search query"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<SearchModal open={true} onClose={onClose} />);
    // Backdrop is the div with aria-hidden="true" and bg-black/50 class.
    const backdrop = document.querySelector("[aria-hidden='true'].absolute") as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows type-at-least-2-chars hint when query is short", () => {
    render(<SearchModal open={true} onClose={onClose} />);
    expect(screen.getByText("Type at least 2 characters to search")).toBeTruthy();
  });

  it("shows Searching... when isFetching is true and query is long enough", () => {
    // Set isFetching=true before rendering so the branch is active from first render.
    mockUseQuery.mockReturnValue({ data: undefined, isFetching: true });

    render(<SearchModal open={true} onClose={onClose} />);
    const input = screen.getByLabelText("Search query");
    // Type a query of at least 2 chars to leave the "too short" branch.
    fireEvent.change(input, { target: { value: "us" } });

    expect(screen.getByText("Searching...")).toBeTruthy();
  });

  it("shows no-results message when query is long enough but results are empty", () => {
    mockUseQuery.mockReturnValue({ data: { results: [] }, isFetching: false });

    render(<SearchModal open={true} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Search query"), {
      target: { value: "zzz" },
    });

    expect(screen.getByText(/No results for/)).toBeTruthy();
  });

  it("renders result items when results are returned", () => {
    const results = makeResults();
    mockUseQuery.mockReturnValue({
      data: { results },
      isFetching: false,
    });

    render(<SearchModal open={true} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Search query"), {
      target: { value: "us" },
    });

    expect(screen.getByText("user-service")).toBeTruthy();
    expect(screen.getByText("platform team")).toBeTruthy();
  });

  it("navigates to result href and calls onClose when a result is clicked", () => {
    const results = makeResults();
    mockUseQuery.mockReturnValue({ data: { results }, isFetching: false });

    render(<SearchModal open={true} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Search query"), {
      target: { value: "us" },
    });

    // Click the first result button.
    const firstResultButton = screen
      .getAllByRole("option")[0]!
      .querySelector("button")!;
    fireEvent.click(firstResultButton);

    expect(mockPush).toHaveBeenCalledWith("/catalog/c-1");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves selection down on ArrowDown and navigates on Enter", () => {
    const results = makeResults();
    mockUseQuery.mockReturnValue({ data: { results }, isFetching: false });

    render(<SearchModal open={true} onClose={onClose} />);
    const input = screen.getByLabelText("Search query");
    fireEvent.change(input, { target: { value: "us" } });

    // ArrowDown moves to index 1.
    fireEvent.keyDown(input, { key: "ArrowDown" });
    // Enter on index 1 navigates to the team href.
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/teams/t-1");
  });

  it("moves selection up on ArrowUp (clamped to 0)", () => {
    const results = makeResults();
    mockUseQuery.mockReturnValue({ data: { results }, isFetching: false });

    render(<SearchModal open={true} onClose={onClose} />);
    const input = screen.getByLabelText("Search query");
    fireEvent.change(input, { target: { value: "us" } });

    // ArrowUp when already at index 0 stays at 0.
    fireEvent.keyDown(input, { key: "ArrowUp" });
    // Enter navigates the currently selected (first) result.
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/catalog/c-1");
  });

  it("does not navigate on Enter when there are no results", () => {
    mockUseQuery.mockReturnValue({ data: { results: [] }, isFetching: false });

    render(<SearchModal open={true} onClose={onClose} />);
    const input = screen.getByLabelText("Search query");
    fireEvent.change(input, { target: { value: "us" } });

    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("clears the query when the clear button is clicked", () => {
    mockUseQuery.mockReturnValue(defaultQueryState);

    render(<SearchModal open={true} onClose={onClose} />);
    const input = screen.getByLabelText("Search query");
    fireEvent.change(input, { target: { value: "test" } });

    // Clear button appears when query is non-empty.
    const clearBtn = screen.getByLabelText("Clear search");
    fireEvent.click(clearBtn);

    expect((input as HTMLInputElement).value).toBe("");
  });

  it("renders the fallback Search icon for unknown result types", () => {
    // The unknown-type entry in makeResults() triggers the `?? Search` branch in ResultIcon.
    const results = makeResults();
    mockUseQuery.mockReturnValue({ data: { results }, isFetching: false });

    render(<SearchModal open={true} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Search query"), {
      target: { value: "us" },
    });

    // All three result items are rendered — the component must not crash on
    // an unrecognised type.
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });
});
