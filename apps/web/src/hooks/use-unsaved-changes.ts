import { useEffect } from "react";

/**
 * Registers a browser `beforeunload` guard whenever `isDirty` is true,
 * prompting the user before they navigate away with unsaved changes.
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

    window.onbeforeunload = handler;

    return () => {
      window.onbeforeunload = null;
    };
  }, [isDirty]);

  // Always clear on unmount (covers the isDirty=false path too)
  useEffect(() => {
    return () => {
      window.onbeforeunload = null;
    };
  }, []);

  return { showBadge: isDirty };
}
