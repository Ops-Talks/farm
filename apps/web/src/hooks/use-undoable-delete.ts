import { useRef, useCallback } from "react";
import { toast } from "sonner";

interface UseUndoableDeleteOptions {
  toastMessage?: string;
  undoLabel?: string;
  durationMs?: number;
}

/**
 * Implements the "undo-on-toast" pattern: immediately calls `deleteFn`,
 * then shows a Sonner toast with an Undo action that invokes `restoreFn`
 * at most once and dismisses the toast.
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

  const undoneRef = useRef(false);

  const invoke = useCallback(() => {
    undoneRef.current = false;
    deleteFn();
    const toastId = toast(toastMessage, {
      duration: durationMs,
      action: {
        label: undoLabel,
        onClick: () => {
          // Guard against double-clicks and prevent restoreFn from running
          // more than once for a single delete.
          if (undoneRef.current) return;
          undoneRef.current = true;
          restoreFn();
          toast.dismiss(toastId);
        },
      },
    });
  }, [deleteFn, restoreFn, toastMessage, undoLabel, durationMs]);

  return { invoke };
}
