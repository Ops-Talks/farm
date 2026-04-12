"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import type { TemplateVariable } from "@/types/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a variable should be visible given the current form values.
 *
 * dependsOn rules:
 *  - action === "show": visible only when values[field] === equals
 *  - action === "hide": visible only when values[field] !== equals
 *  - no dependsOn: always visible
 */
function isVisible(
  variable: TemplateVariable,
  values: Record<string, string>,
): boolean {
  const dep = variable.dependsOn;
  if (!dep) return true;

  const currentValue = values[dep.field] ?? "";

  if (dep.action === "show") {
    // Show this field only when the dependency matches the target value
    return currentValue === dep.equals;
  }

  if (dep.action === "hide") {
    // Hide this field when the dependency matches the target value
    return currentValue !== dep.equals;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DynamicParameterFormProps {
  variables: TemplateVariable[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

// ---------------------------------------------------------------------------
// Input renderers
// ---------------------------------------------------------------------------

function renderInput(
  variable: TemplateVariable,
  currentValue: string,
  placeholderText: string,
  onChange: (key: string, value: string) => void,
) {
  const id = `var-${variable.key}`;

  switch (variable.type) {
    case "boolean":
      return (
        <select
          id={id}
          value={currentValue}
          onChange={(e) => onChange(variable.key, e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">-- select --</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );

    case "enum":
      return (
        <select
          id={id}
          value={currentValue}
          onChange={(e) => onChange(variable.key, e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">-- select --</option>
          {(variable.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "multiselect": {
      // Serialize selected values as comma-separated string; deserialize on read
      const selectedValues = currentValue
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      return (
        <select
          id={id}
          multiple
          value={selectedValues}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map(
              (o) => o.value,
            );
            onChange(variable.key, selected.join(","));
          }}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          size={Math.min((variable.options ?? []).length || 3, 5)}
        >
          {(variable.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    case "number":
      return (
        <Input
          id={id}
          type="number"
          value={currentValue}
          placeholder={placeholderText}
          onChange={(e) => onChange(variable.key, e.target.value)}
        />
      );

    // "string" or undefined (default text input)
    default:
      return (
        <Input
          id={id}
          type="text"
          value={currentValue}
          placeholder={placeholderText}
          onChange={(e) => onChange(variable.key, e.target.value)}
        />
      );
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a type-aware form field for each TemplateVariable.
 *
 * Supported types: string (default), number, boolean, enum, multiselect.
 * Visibility is driven by dependsOn rules evaluated against the current values.
 */
export default function DynamicParameterForm({
  variables,
  values,
  onChange,
}: DynamicParameterFormProps) {
  if (variables.length === 0) return null;

  return (
    <div className="space-y-4">
      {variables.map((variable) => {
        if (!isVisible(variable, values)) return null;

        const currentValue = values[variable.key] ?? variable.default ?? "";
        const placeholderText = variable.placeholder ?? variable.default ?? "";

        return (
          <div key={variable.key} className="flex flex-col gap-1">
            {/* Label with required indicator */}
            <label
              htmlFor={`var-${variable.key}`}
              className="text-sm font-medium"
            >
              {variable.label}
              {variable.required && (
                <span className="ml-1 text-destructive" aria-label="required">
                  *
                </span>
              )}
            </label>

            {/* Type-aware input */}
            {renderInput(variable, currentValue, placeholderText, onChange)}

            {/* Description helper text */}
            {variable.description && (
              <p className="text-xs text-muted-foreground">
                {variable.description}
              </p>
            )}

            {/* Pattern helper text */}
            {variable.pattern && (
              <p className="text-xs text-muted-foreground font-mono">
                Pattern: {variable.pattern}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
