import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrollToError } from "./use-scroll-to-error";

function makeMockElement(): HTMLElement {
  return {
    scrollIntoView: vi.fn(),
    focus: vi.fn(),
  } as unknown as HTMLElement;
}

describe("useScrollToError", () => {
  it("calls scrollIntoView on the element registered for the first error key", () => {
    const { result } = renderHook(() => useScrollToError());
    const el = makeMockElement();

    act(() => {
      result.current.registerRef("username", el);
    });

    act(() => {
      result.current.scrollToFirstError({ username: "required" });
    });

    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("calls focus() on the element", () => {
    const { result } = renderHook(() => useScrollToError());
    const el = makeMockElement();

    act(() => {
      result.current.registerRef("email", el);
    });

    act(() => {
      result.current.scrollToFirstError({ email: "invalid" });
    });

    expect(el.focus).toHaveBeenCalledTimes(1);
  });

  it("does nothing when errors object is empty", () => {
    const { result } = renderHook(() => useScrollToError());
    const el = makeMockElement();

    act(() => {
      result.current.registerRef("name", el);
    });

    act(() => {
      result.current.scrollToFirstError({});
    });

    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });

  it("does nothing when no element is registered for the error key", () => {
    const { result } = renderHook(() => useScrollToError());

    // No registration — should not throw
    act(() => {
      result.current.scrollToFirstError({ missingField: "required" });
    });
  });

  it("registering a ref with null does not cause errors", () => {
    const { result } = renderHook(() => useScrollToError());

    act(() => {
      result.current.registerRef("field", null);
    });

    // scrollToFirstError must gracefully handle null el
    act(() => {
      result.current.scrollToFirstError({ field: "required" });
    });
  });
});
