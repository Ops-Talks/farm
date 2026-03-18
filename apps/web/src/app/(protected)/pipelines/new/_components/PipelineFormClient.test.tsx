import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockCreate = vi.fn();

vi.mock("@/lib/api-client", () => ({
  pipelines: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: { message: string | string[] }) {
      super(typeof body.message === "string" ? body.message : body.message.join(", "));
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
}));

// Stub StageBuilder so tests don't need drag-and-drop infrastructure.
vi.mock(
  "@/app/(protected)/pipelines/_components/stage-builder",
  () => ({
    StageBuilder: ({ onChange }: { onChange: (s: unknown[]) => void }) => (
      <button
        type="button"
        data-testid="stub-stage-builder"
        onClick={() => onChange([])}
      >
        StageBuilder
      </button>
    ),
  }),
);

import { PipelineFormClient } from "@/app/(protected)/pipelines/new/_components/PipelineFormClient";
import { ApiError } from "@/lib/api-client";

describe("PipelineFormClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form with name and description fields", () => {
    render(<PipelineFormClient />);
    expect(screen.getByRole("heading", { name: "Create Pipeline" })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Pipeline" })).toBeInTheDocument();
  });

  it("shows validation error when name is empty on submit", async () => {
    const user = userEvent.setup();
    render(<PipelineFormClient />);

    await user.click(screen.getByRole("button", { name: "Create Pipeline" }));

    await waitFor(() => {
      expect(screen.getByText("Pipeline name is required")).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls pipelines.create() with name and redirects on success", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValueOnce({ id: "p1", name: "deploy-prod" });
    render(<PipelineFormClient />);

    await user.type(screen.getByLabelText(/name/i), "deploy-prod");
    await user.click(screen.getByRole("button", { name: "Create Pipeline" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledOnce();
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "deploy-prod" }),
    );
  });

  it("shows API error message when creation fails", async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValueOnce(
      new ApiError(422, { message: "Name already exists", statusCode: 422, timestamp: "2025-01-01T00:00:00Z", path: "/test" }),
    );
    render(<PipelineFormClient />);

    await user.type(screen.getByLabelText(/name/i), "existing-pipeline");
    await user.click(screen.getByRole("button", { name: "Create Pipeline" }));

    await waitFor(() => {
      expect(screen.getByText("Name already exists")).toBeInTheDocument();
    });
  });

  it("disables the submit button while submitting", async () => {
    const user = userEvent.setup();
    let resolve: () => void;
    mockCreate.mockReturnValueOnce(
      new Promise<{ id: string; name: string }>((r) => {
        resolve = () => r({ id: "p1", name: "deploy-prod" });
      }),
    );
    render(<PipelineFormClient />);

    await user.type(screen.getByLabelText(/name/i), "deploy-prod");
    await user.click(screen.getByRole("button", { name: "Create Pipeline" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    });

    resolve!();
  });
});
