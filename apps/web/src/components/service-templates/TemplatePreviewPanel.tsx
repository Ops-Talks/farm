"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import DynamicParameterForm from "./DynamicParameterForm";
import { serviceTemplates } from "@/lib/api-client";
import type { TemplateVariable, DryRunResultDto } from "@/types/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplatePreviewPanelProps {
  templateId: string;
  variables: TemplateVariable[];
  initialValues?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Split-view panel for live template preview.
 *
 * Left panel  — DynamicParameterForm for variable input.
 * Right panel — rendered preview in a <pre> block.
 *
 * Variable changes are debounced 300 ms before triggering a preview fetch.
 * On mount the panel immediately schedules a preview call (also via the
 * debounce timer) with the supplied initialValues.
 */
export default function TemplatePreviewPanel({
  templateId,
  variables,
  initialValues,
}: TemplatePreviewPanelProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [values, setValues] = useState<Record<string, string>>(
    initialValues ?? {},
  );
  const [result, setResult] = useState<DryRunResultDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer ref for the debounce — stable across renders, no re-render needed.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch function ───────────────────────────────────────────────────────

  /**
   * Calls the preview endpoint and stores the result.
   * Wrapped in useCallback so the useEffect dependency array is stable
   * as long as templateId doesn't change.
   */
  const fetchPreview = useCallback(
    async (vals: Record<string, string>) => {
      setLoading(true);
      setError(null);
      try {
        const data = await serviceTemplates.preview(templateId, vals);
        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch preview",
        );
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [templateId],
  );

  // ── Debounced preview trigger ────────────────────────────────────────────

  useEffect(() => {
    // Cancel any pending timer before scheduling a new one.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void fetchPreview(values);
    }, 300);

    // Cleanup: cancel the timer if the component unmounts or values/fetchPreview changes.
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [values, fetchPreview]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full gap-4">
      {/* ── Left panel: variable inputs ───────────────────────────────── */}
      <div className="flex-1 overflow-auto rounded-lg border border-border p-4">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Parameters
        </h3>
        <DynamicParameterForm
          variables={variables}
          values={values}
          onChange={handleChange}
        />
      </div>

      {/* ── Right panel: rendered preview ────────────────────────────── */}
      <div className="flex-1 overflow-auto rounded-lg border border-border p-4">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Preview</h3>

        {/* Validation errors (shown even when valid === false) */}
        {result && !result.valid && result.errors.length > 0 && (
          <div
            className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3"
            role="alert"
          >
            <p className="mb-1 text-xs font-semibold text-destructive">
              Validation errors
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-destructive">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <p className="text-xs text-muted-foreground">Loading preview...</p>
        )}

        {/* Fetch error */}
        {!loading && error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* Preview content */}
        {!loading && !error && result && (
          <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs font-mono">
            {result.preview}
          </pre>
        )}
      </div>
    </div>
  );
}
