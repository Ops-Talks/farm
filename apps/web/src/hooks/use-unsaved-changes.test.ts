import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnsavedChanges } from "./use-unsaved-changes";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUnsavedChanges", () => {
  it("registers a beforeunload listener when isDirty=true", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => useUnsavedChanges(true));
    expect(
      addSpy.mock.calls.some(([event]) => event === "beforeunload"),
    ).toBe(true);
  });

  it("does not register a beforeunload listener when isDirty=false", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => useUnsavedChanges(false));
    expect(
      addSpy.mock.calls.some(([event]) => event === "beforeunload"),
    ).toBe(false);
  });

  it("removes the beforeunload listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useUnsavedChanges(true));
    unmount();
    expect(
      removeSpy.mock.calls.some(([event]) => event === "beforeunload"),
    ).toBe(true);
  });

  it("does not overwrite a pre-existing window.onbeforeunload handler", () => {
    const existing = vi.fn();
    window.onbeforeunload = existing;
    const { unmount } = renderHook(() => useUnsavedChanges(true));
    expect(window.onbeforeunload).toBe(existing);
    unmount();
    expect(window.onbeforeunload).toBe(existing);
    window.onbeforeunload = null;
  });

  it("returns showBadge=true when isDirty=true", () => {
    const { result } = renderHook(() => useUnsavedChanges(true));
    expect(result.current.showBadge).toBe(true);
  });

  it("returns showBadge=false when isDirty=false", () => {
    const { result } = renderHook(() => useUnsavedChanges(false));
    expect(result.current.showBadge).toBe(false);
  });
});
