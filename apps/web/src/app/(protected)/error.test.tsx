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
    expect(console.error).toHaveBeenCalledWith("[ErrorBoundary]", err);
  });

  it("renders a details block exposing error.name and error.message", () => {
    const err = Object.assign(new globalThis.Error("crash message"), { name: "TypeError" });
    render(<ErrorPage error={err} reset={vi.fn()} />);
    expect(screen.getByText(/TypeError: crash message/)).toBeInTheDocument();
  });

  it("renders the digest when error.digest is set", () => {
    const err = Object.assign(new globalThis.Error("Test error"), {
      digest: "abc123",
    });
    render(<ErrorPage error={err} reset={vi.fn()} />);
    expect(screen.getByText(/Digest: abc123/)).toBeInTheDocument();
  });

  it("renders the stack trace when error.stack is set", () => {
    const err = Object.assign(new globalThis.Error("Test error"), {
      stack: "Error: Test error\n    at Object.<anonymous>",
    });
    render(<ErrorPage error={err} reset={vi.fn()} />);
    expect(
      screen.getByText(/Error: Test error/),
    ).toBeInTheDocument();
  });

  it("calls window.location.reload when Reload Page is clicked", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    });
    render(<ErrorPage error={new globalThis.Error("Test error")} reset={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Reload Page" }));
    expect(reloadMock).toHaveBeenCalled();
  });
});

