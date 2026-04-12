import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DynamicParameterForm from "../DynamicParameterForm";
import type { TemplateVariable } from "@/types/api";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const textVar: TemplateVariable = {
  key: "SERVICE_NAME",
  label: "Service Name",
  description: "The name of the service",
  required: true,
  type: "string",
};

const numberVar: TemplateVariable = {
  key: "PORT",
  label: "Port",
  description: "The HTTP port",
  required: false,
  type: "number",
};

const boolVar: TemplateVariable = {
  key: "ENABLE_TLS",
  label: "Enable TLS",
  description: "Whether to enable TLS",
  required: false,
  type: "boolean",
};

const enumVar: TemplateVariable = {
  key: "ENV",
  label: "Environment",
  description: "Deployment environment",
  required: true,
  type: "enum",
  options: ["dev", "staging", "production"],
};

const multiselectVar: TemplateVariable = {
  key: "FEATURES",
  label: "Features",
  description: "Enabled features",
  required: false,
  type: "multiselect",
  options: ["auth", "metrics", "tracing"],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DynamicParameterForm", () => {
  it("renders text input for string type", () => {
    render(
      <DynamicParameterForm
        variables={[textVar]}
        values={{}}
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("renders number input for number type", () => {
    render(
      <DynamicParameterForm
        variables={[numberVar]}
        values={{}}
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("spinbutton");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "number");
  });

  it("renders select for enum type with options", () => {
    render(
      <DynamicParameterForm
        variables={[enumVar]}
        values={{}}
        onChange={vi.fn()}
      />,
    );

    // The combobox role covers a plain <select>
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    expect(screen.getByRole("option", { name: "dev" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "staging" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "production" }),
    ).toBeInTheDocument();
  });

  it("renders boolean select with true/false options", () => {
    render(
      <DynamicParameterForm
        variables={[boolVar]}
        values={{}}
        onChange={vi.fn()}
      />,
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "true" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "false" })).toBeInTheDocument();
  });

  it("renders multiselect for multiselect type", () => {
    render(
      <DynamicParameterForm
        variables={[multiselectVar]}
        values={{}}
        onChange={vi.fn()}
      />,
    );

    // A <select multiple> has role="listbox"
    const select = screen.getByRole("listbox");
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute("multiple");

    expect(screen.getByRole("option", { name: "auth" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "metrics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "tracing" }),
    ).toBeInTheDocument();
  });

  it("shows required indicator for required variables", () => {
    render(
      <DynamicParameterForm
        variables={[textVar]}
        values={{}}
        onChange={vi.fn()}
      />,
    );

    // The required star has aria-label="required"
    expect(screen.getByLabelText("required")).toBeInTheDocument();
  });

  it("shows description helper text", () => {
    render(
      <DynamicParameterForm
        variables={[textVar]}
        values={{}}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("The name of the service"),
    ).toBeInTheDocument();
  });

  it("shows pattern helper text", () => {
    const varWithPattern: TemplateVariable = {
      ...textVar,
      pattern: "^[a-z][a-z0-9-]*$",
    };

    render(
      <DynamicParameterForm
        variables={[varWithPattern]}
        values={{}}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Pattern: ^[a-z][a-z0-9-]*$"),
    ).toBeInTheDocument();
  });

  it("hides field when dependsOn show-action condition not met", () => {
    const conditionalVar: TemplateVariable = {
      key: "EXTRA",
      label: "Extra Field",
      description: "Shown only when ENV is production",
      required: false,
      dependsOn: { field: "ENV", equals: "production", action: "show" },
    };

    render(
      <DynamicParameterForm
        // ENV is currently "dev", so EXTRA should be hidden
        variables={[enumVar, conditionalVar]}
        values={{ ENV: "dev" }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Extra Field")).not.toBeInTheDocument();
    expect(screen.queryByText("Shown only when ENV is production")).not.toBeInTheDocument();
  });

  it("shows field when dependsOn show-action condition is met", () => {
    const conditionalVar: TemplateVariable = {
      key: "EXTRA",
      label: "Extra Field",
      description: "Shown only when ENV is production",
      required: false,
      dependsOn: { field: "ENV", equals: "production", action: "show" },
    };

    render(
      <DynamicParameterForm
        // ENV is "production" — EXTRA should now be visible
        variables={[enumVar, conditionalVar]}
        values={{ ENV: "production" }}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Shown only when ENV is production"),
    ).toBeInTheDocument();
  });

  it("hides field when dependsOn hide-action condition is met", () => {
    const conditionalVar: TemplateVariable = {
      key: "DEBUG_MODE",
      label: "Debug Mode",
      description: "Hidden in production",
      required: false,
      dependsOn: { field: "ENV", equals: "production", action: "hide" },
    };

    render(
      <DynamicParameterForm
        // ENV is "production" → hide DEBUG_MODE
        variables={[enumVar, conditionalVar]}
        values={{ ENV: "production" }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Hidden in production")).not.toBeInTheDocument();
  });

  it("calls onChange when input value changes", () => {
    const handleChange = vi.fn();

    render(
      <DynamicParameterForm
        variables={[textVar]}
        values={{ SERVICE_NAME: "old-value" }}
        onChange={handleChange}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "new-value" } });

    expect(handleChange).toHaveBeenCalledWith("SERVICE_NAME", "new-value");
  });

  it("serializes multiselect values as comma-separated string", () => {
    const handleChange = vi.fn();

    render(
      <DynamicParameterForm
        variables={[multiselectVar]}
        values={{}}
        onChange={handleChange}
      />,
    );

    const select = screen.getByRole("listbox") as HTMLSelectElement;

    // Simulate selecting "auth" and "tracing"
    const authOption = screen.getByRole("option", {
      name: "auth",
    }) as HTMLOptionElement;
    const tracingOption = screen.getByRole("option", {
      name: "tracing",
    }) as HTMLOptionElement;

    // Mark both options as selected in the DOM so selectedOptions reflects them
    authOption.selected = true;
    tracingOption.selected = true;

    fireEvent.change(select);

    // The onChange should be called with a comma-separated string
    expect(handleChange).toHaveBeenCalledWith(
      "FEATURES",
      expect.stringMatching(/auth.*tracing|tracing.*auth/),
    );
  });

  it("renders nothing when variables array is empty", () => {
    const { container } = render(
      <DynamicParameterForm variables={[]} values={{}} onChange={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
