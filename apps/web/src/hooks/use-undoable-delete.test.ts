import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { toast } from "sonner";
import { useUndoableDelete } from "./use-undoable-delete";

// `toast` is mocked globally via src/test/setup.ts
// Cast to access the mock API
const mockToast = toast as unknown as ReturnType<typeof vi.fn> & {
  success: ReturnType<typeof vi.fn>;
};

describe("useUndoableDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls deleteFn immediately when invoke() is called", () => {
    const deleteFn = vi.fn();
    const restoreFn = vi.fn();

    const { result } = renderHook(() => useUndoableDelete(deleteFn, restoreFn));

    act(() => {
      result.current.invoke();
    });

    expect(deleteFn).toHaveBeenCalledTimes(1);
  });

  it("calls toast() with the message when invoke() is called", () => {
    const deleteFn = vi.fn();
    const restoreFn = vi.fn();

    const { result } = renderHook(() =>
      useUndoableDelete(deleteFn, restoreFn, { toastMessage: "Deleted!" }),
    );

    act(() => {
      result.current.invoke();
    });

    expect(mockToast).toHaveBeenCalledWith(
      "Deleted!",
      expect.objectContaining({ duration: 5000 }),
    );
  });

  it("calls restoreFn when the toast action onClick is triggered", () => {
    const deleteFn = vi.fn();
    const restoreFn = vi.fn();

    const { result } = renderHook(() => useUndoableDelete(deleteFn, restoreFn));

    act(() => {
      result.current.invoke();
    });

    // Grab the action.onClick from the toast call arguments
    const toastCallArgs = mockToast.mock.calls[0];
    const options = toastCallArgs[1] as { action: { onClick: () => void } };
    act(() => {
      options.action.onClick();
    });

    expect(restoreFn).toHaveBeenCalledTimes(1);
  });

  it("does NOT call restoreFn when action is not clicked", () => {
    const deleteFn = vi.fn();
    const restoreFn = vi.fn();

    const { result } = renderHook(() => useUndoableDelete(deleteFn, restoreFn));

    act(() => {
      result.current.invoke();
    });

    expect(restoreFn).not.toHaveBeenCalled();
  });

  it("passes custom toastMessage and undoLabel to toast", () => {
    const deleteFn = vi.fn();
    const restoreFn = vi.fn();

    const { result } = renderHook(() =>
      useUndoableDelete(deleteFn, restoreFn, {
        toastMessage: "Record removed",
        undoLabel: "Revert",
      }),
    );

    act(() => {
      result.current.invoke();
    });

    expect(mockToast).toHaveBeenCalledWith(
      "Record removed",
      expect.objectContaining({
        action: expect.objectContaining({ label: "Revert" }),
      }),
    );
  });

  it("calls deleteFn exactly once per invoke() call", () => {
    const deleteFn = vi.fn();
    const restoreFn = vi.fn();

    const { result } = renderHook(() => useUndoableDelete(deleteFn, restoreFn));

    act(() => {
      result.current.invoke();
      result.current.invoke();
    });

    expect(deleteFn).toHaveBeenCalledTimes(2);
  });
});
