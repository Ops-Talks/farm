import { useRef, useCallback } from "react";
import { toast } from "sonner";

interface UseUndoableDeleteOptions {
  toastMessage?: string;
  undoLabel?: string;
  durationMs?: number;
}

/**
 * Implements the "undo-on-toast" pattern: immediately calls `deleteFn`,
 * then shows a Sonner toast with an Undo action that invokes `restoreFn`.
 */
export function useUndoableDelete(
  deleteFn: () => void,
  restoreFn: () => void,
  options: UseUndoableDeleteOptions = {},
) {
  const {
    toastMessage = "Item deleted",
    undoLabel = "Undo",
    durationMs = 5000,
  } = options;

  const undone = useRef(false);

  const invoke = useCallback(() => {
    undone.current = false;
    deleteFn();
    toast(toastMessage, {
      duration: durationMs,
      action: {
        label: undoLabel,
        onClick: () => {
          undone.current = true;
          restoreFn();
        },
      },
    });
  }, [deleteFn, restoreFn, toastMessage, undoLabel, durationMs]);

  return { invoke };
}
