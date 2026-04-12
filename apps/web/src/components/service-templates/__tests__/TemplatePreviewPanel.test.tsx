import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import TemplatePreviewPanel from "../TemplatePreviewPanel";
import * as apiClient from "@/lib/api-client";
import type { DryRunResultDto, TemplateVariable } from "@/types/api";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const textVar: TemplateVariable = {
  key: "SERVICE_NAME",
  label: "Service Name",
  description: "Name of the service",
  required: false,
};

const SUCCESS_RESULT: DryRunResultDto = {
  valid: true,
  errors: [],
  preview: "name: my-service\nport: 3000",
};

const INVALID_RESULT: DryRunResultDto = {
  valid: false,
  errors: ["SERVICE_NAME is required", "PORT must be a number"],
  preview: "",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TemplatePreviewPanel", () => {
  let previewSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Default: successful preview
    previewSpy = vi
      .spyOn(apiClient.serviceTemplates, "preview")
      .mockResolvedValue(SUCCESS_RESULT);
  });

  afterEach(() => {
    previewSpy.mockRestore();
    vi.useRealTimers();
  });

  // ── Layout ──────────────────────────────────────────────────────────────

  it("renders variable form and preview panel", () => {
    vi.useFakeTimers();

    render(
      <TemplatePreviewPanel
        templateId="t1"
        variables={[textVar]}
      />,
    );

    // Headings for both panels
    expect(screen.getByText("Parameters")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();

    // Variable label is rendered in the form
    expect(screen.getByText("Service Name")).toBeInTheDocument();
  });

  // ── Loading state ────────────────────────────────────────────────────────

  it("shows loading state while fetching preview", async () => {
    vi.useFakeTimers();

    // A promise that we control — never resolves automatically
    let resolvePreview!: (val: DryRunResultDto) => void;
    previewSpy.mockReturnValue(
      new Promise<DryRunResultDto>((res) => {
        resolvePreview = res;
      }),
    );

    render(
      <TemplatePreviewPanel templateId="t1" variables={[]} />,
    );

    // Fire the debounce timer
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Loading preview...")).toBeInTheDocument();

    // Resolve the promise and flush
    await act(async () => {
      resolvePreview(SUCCESS_RESULT);
    });

    expect(screen.queryByText("Loading preview...")).not.toBeInTheDocument();
  });

  // ── Successful preview ───────────────────────────────────────────────────

  it("renders preview text after successful fetch", async () => {
    vi.useFakeTimers();

    render(
      <TemplatePreviewPanel templateId="t1" variables={[]} />,
    );

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Wait for the async state update to finish
    await act(async () => {});

    // Use a regex because the <pre> element may have surrounding whitespace
    // from JSX indentation, which causes exact-string getByText to fail.
    expect(
      screen.getByText(/name: my-service/),
    ).toBeInTheDocument();
    expect(screen.getByText(/port: 3000/)).toBeInTheDocument();
  });

  // ── Validation errors ────────────────────────────────────────────────────

  it("shows validation errors when valid is false", async () => {
    vi.useFakeTimers();
    previewSpy.mockResolvedValue(INVALID_RESULT);

    render(
      <TemplatePreviewPanel templateId="t1" variables={[]} />,
    );

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await act(async () => {});

    expect(screen.getByText("Validation errors")).toBeInTheDocument();
    expect(
      screen.getByText("SERVICE_NAME is required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("PORT must be a number"),
    ).toBeInTheDocument();
  });

  // ── Fetch failure ────────────────────────────────────────────────────────

  it("shows error message on fetch failure", async () => {
    vi.useFakeTimers();
    previewSpy.mockRejectedValue(new Error("Network error"));

    render(
      <TemplatePreviewPanel templateId="t1" variables={[]} />,
    );

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await act(async () => {});

    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  // ── Debouncing ───────────────────────────────────────────────────────────

  it("debounces preview calls — only one call per 300 ms burst", async () => {
    vi.useFakeTimers();

    render(
      <TemplatePreviewPanel
        templateId="t1"
        variables={[textVar]}
      />,
    );

    // Resolve the initial mount call
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {});

    expect(previewSpy).toHaveBeenCalledTimes(1);

    // Rapid successive changes — each resets the debounce timer
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.change(input, { target: { value: "abc" } });

    // Not yet — timer hasn't fired
    expect(previewSpy).toHaveBeenCalledTimes(1);

    // Advance past debounce — only ONE additional call should happen
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {});

    expect(previewSpy).toHaveBeenCalledTimes(2);
  });

  // ── Initial mount ────────────────────────────────────────────────────────

  it("calls preview on initial mount with initialValues", async () => {
    vi.useFakeTimers();

    const initialValues = { SERVICE_NAME: "hello-world" };

    render(
      <TemplatePreviewPanel
        templateId="t2"
        variables={[textVar]}
        initialValues={initialValues}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {});

    expect(previewSpy).toHaveBeenCalledWith("t2", initialValues);
  });

  // ── Non-Error exception ───────────────────────────────────────────────────

  it("shows generic error message when a non-Error is thrown", async () => {
    vi.useFakeTimers();
    // Reject with a plain string, not an Error instance
    previewSpy.mockRejectedValue("plain rejection string");

    render(
      <TemplatePreviewPanel templateId="t1" variables={[]} />,
    );

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {});

    // Falls back to the hardcoded "Failed to fetch preview" string
    expect(screen.getByText("Failed to fetch preview")).toBeInTheDocument();
  });

  // ── Valid=false with no errors ────────────────────────────────────────────

  it("does not show validation error block when valid=false but errors array is empty", async () => {
    vi.useFakeTimers();
    previewSpy.mockResolvedValue({ valid: false, errors: [], preview: "" });

    render(
      <TemplatePreviewPanel templateId="t1" variables={[]} />,
    );

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {});

    expect(screen.queryByText("Validation errors")).not.toBeInTheDocument();
  });
});
