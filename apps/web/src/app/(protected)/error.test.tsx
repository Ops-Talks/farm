import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import ErrorPage from "@/app/(protected)/error";

describe("Error page", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders 'Something went wrong!' heading", () => {
    render(<ErrorPage error={new globalThis.Error("Test error")} reset={vi.fn()} />);
    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
  });

  it("renders the Try Again button", () => {
    render(<ErrorPage error={new globalThis.Error("Test error")} reset={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
  });

  it("renders the Reload Page button", () => {
    render(<ErrorPage error={new globalThis.Error("Test error")} reset={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Reload Page" })).toBeInTheDocument();
  });

  it("calls reset when Try Again is clicked", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const reset = vi.fn();
    render(<ErrorPage error={new globalThis.Error("Test error")} reset={reset} />);
    await user.click(screen.getByRole("button", { name: "Try Again" }));
    expect(reset).toHaveBeenCalled();
  });

  it("logs the error to console.error on mount", () => {
    const err = new globalThis.Error("Something bad");
    render(<ErrorPage error={err} reset={vi.fn()} />);
    expect(console.error).toHaveBeenCalledWith(err);
  });
});

