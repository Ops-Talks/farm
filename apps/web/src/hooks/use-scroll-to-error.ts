import { useRef, useCallback } from "react";

/**
 * Provides a ref registry and a scroll-to-first-error helper.
 *
 * Usage:
 *   const { registerRef, scrollToFirstError } = useScrollToError();
 *   // in JSX: ref={(el) => registerRef("fieldName", el)}
 *   // on submit error: scrollToFirstError(formErrors)
 */
export function useScrollToError() {
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const registerRef = useCallback((name: string, el: HTMLElement | null) => {
    refs.current[name] = el;
  }, []);

  const scrollToFirstError = useCallback((errors: Record<string, unknown>) => {
    const firstKey = Object.keys(errors)[0];
    if (!firstKey) return;
    const el = refs.current[firstKey];
    if (el) {
      el.scrollIntoView?.({ behavior: "smooth", block: "center" });
      el.focus?.();
    }
  }, []);

  return { registerRef, scrollToFirstError };
}
