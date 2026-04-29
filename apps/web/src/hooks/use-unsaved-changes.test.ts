import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUnsavedChanges } from "./use-unsaved-changes";

afterEach(() => {
  window.onbeforeunload = null;
});

describe("useUnsavedChanges", () => {
  it("sets window.onbeforeunload when isDirty=true", () => {
    renderHook(() => useUnsavedChanges(true));
    expect(window.onbeforeunload).not.toBeNull();
  });

  it("does not set window.onbeforeunload when isDirty=false", () => {
    renderHook(() => useUnsavedChanges(false));
    expect(window.onbeforeunload).toBeNull();
  });

  it("clears window.onbeforeunload on unmount", () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true));
    expect(window.onbeforeunload).not.toBeNull();
    unmount();
    expect(window.onbeforeunload).toBeNull();
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
