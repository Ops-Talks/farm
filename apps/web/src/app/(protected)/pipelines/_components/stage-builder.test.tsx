import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PipelineStage } from "@/types/api";

import { StageBuilder } from "@/app/(protected)/pipelines/_components/stage-builder";

// StageBuilder has no API dependencies — test it directly.

describe("StageBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no stages are provided", () => {
    render(<StageBuilder stages={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/no stages defined/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ add stage/i })).toBeInTheDocument();
  });

  it("renders existing stages", () => {
    const stages: PipelineStage[] = [
      { id: "s1", name: "Build", type: "script", order: 0, config: { command: "npm run build" } },
      { id: "s2", name: "Deploy", type: "deploy", order: 1, config: {} },
    ];
    render(<StageBuilder stages={stages} onChange={vi.fn()} />);
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Deploy")).toBeInTheDocument();
  });

  it("shows validation error when add-stage form is submitted with empty name", async () => {
    const user = userEvent.setup();
    render(<StageBuilder stages={[]} onChange={vi.fn()} />);

    // Open the add-stage panel
    await user.click(screen.getByRole("button", { name: /\+ add stage/i }));

    // Submit without filling in the stage name
    await user.click(screen.getByRole("button", { name: "Add Stage" }));

    await waitFor(() => {
      expect(screen.getByText("Stage name is required")).toBeInTheDocument();
    });
  });

  it("calls onChange with a new stage when valid data is submitted", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<StageBuilder stages={[]} onChange={mockOnChange} />);

    await user.click(screen.getByRole("button", { name: /\+ add stage/i }));
    await user.type(screen.getByLabelText(/stage name/i), "Build");
    await user.click(screen.getByRole("button", { name: "Add Stage" }));

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledOnce();
    });

    const [newStages] = mockOnChange.mock.calls[0] as [PipelineStage[]];
    expect(newStages).toHaveLength(1);
    expect(newStages[0]?.name).toBe("Build");
    expect(newStages[0]?.type).toBe("script");
  });

  it("resets the form and closes the panel after successfully adding a stage", async () => {
    const user = userEvent.setup();
    render(<StageBuilder stages={[]} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /\+ add stage/i }));
    await user.type(screen.getByLabelText(/stage name/i), "Test");
    await user.click(screen.getByRole("button", { name: "Add Stage" }));

    // The form panel should disappear and the "+" button should return
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ add stage/i })).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/stage name/i)).not.toBeInTheDocument();
  });

  it("calls onChange to remove a stage when the remove button is clicked", async () => {
    const user = userEvent.setup();
    const stages: PipelineStage[] = [
      { id: "s1", name: "Build", type: "script", order: 0, config: {} },
    ];
    const mockOnChange = vi.fn();
    render(<StageBuilder stages={stages} onChange={mockOnChange} />);

    await user.click(screen.getByRole("button", { name: /remove stage build/i }));

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it("hides add-stage UI in readOnly mode", () => {
    render(<StageBuilder stages={[]} onChange={vi.fn()} readOnly />);
    expect(screen.queryByRole("button", { name: /\+ add stage/i })).not.toBeInTheDocument();
  });

  it("stores configValue under the correct key based on stage type", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(<StageBuilder stages={[]} onChange={mockOnChange} />);

    await user.click(screen.getByRole("button", { name: /\+ add stage/i }));
    await user.type(screen.getByLabelText(/stage name/i), "Notify Slack");
    // Change type to "notify"
    await user.selectOptions(screen.getByLabelText(/type/i), "notify");
    await user.type(screen.getByLabelText(/channel/i), "#releases");
    await user.click(screen.getByRole("button", { name: "Add Stage" }));

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledOnce();
    });

    const [newStages] = mockOnChange.mock.calls[0] as [PipelineStage[]];
    expect(newStages[0]?.config).toEqual({ channel: "#releases" });
  });
});
