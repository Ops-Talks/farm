import { useEffect } from "react";

/**
 * Registers a browser `beforeunload` guard whenever `isDirty` is true,
 * prompting the user before they navigate away with unsaved changes.
 *
 * Uses `addEventListener`/`removeEventListener` so it composes safely with
 * other handlers and other instances of this hook (does not trample
 * `window.onbeforeunload`).
 *
 * Returns `{ showBadge }` so callers can surface a visual indicator.
 */
export function useUnsavedChanges(isDirty: boolean): { showBadge: boolean } {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy support: some browsers still require returnValue
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [isDirty]);

  return { showBadge: isDirty };
}
