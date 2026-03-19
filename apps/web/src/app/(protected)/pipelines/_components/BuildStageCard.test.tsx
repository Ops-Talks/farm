import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BuildStageCard } from "./BuildStageCard";

describe("BuildStageCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all required form fields", () => {
    render(<BuildStageCard onSave={vi.fn()} />);

    // Engine select
    expect(screen.getByLabelText(/engine/i)).toBeInTheDocument();
    // Tag (required)
    expect(screen.getByLabelText(/image tag/i)).toBeInTheDocument();
    // Dockerfile
    expect(screen.getByLabelText(/dockerfile/i)).toBeInTheDocument();
    // Build Context
    expect(screen.getByLabelText(/build context/i)).toBeInTheDocument();
    // Push checkbox
    expect(screen.getByLabelText(/push image to registry/i)).toBeInTheDocument();
  });

  it("shows docker, buildah, podman engine options", () => {
    render(<BuildStageCard onSave={vi.fn()} />);

    const select = screen.getByLabelText(/engine/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "docker" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "buildah" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "podman" })).toBeInTheDocument();
  });

  it("defaults engine to docker", () => {
    render(<BuildStageCard onSave={vi.fn()} />);

    const select = screen.getByLabelText(/engine/i) as HTMLSelectElement;
    expect(select.value).toBe("docker");
  });

  it("defaults dockerfile to 'Dockerfile'", () => {
    render(<BuildStageCard onSave={vi.fn()} />);

    const input = screen.getByLabelText(/dockerfile/i) as HTMLInputElement;
    expect(input.value).toBe("Dockerfile");
  });

  it("defaults context to '.'", () => {
    render(<BuildStageCard onSave={vi.fn()} />);

    const input = screen.getByLabelText(/build context/i) as HTMLInputElement;
    expect(input.value).toBe(".");
  });

  it("defaults push to false (unchecked)", () => {
    render(<BuildStageCard onSave={vi.fn()} />);

    const checkbox = screen.getByLabelText(/push image to registry/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("does not show registry field when push is false", () => {
    render(<BuildStageCard onSave={vi.fn()} />);

    expect(screen.queryByLabelText(/registry url/i)).not.toBeInTheDocument();
  });

  it("shows registry field when push toggle is enabled", async () => {
    const user = userEvent.setup();
    render(<BuildStageCard onSave={vi.fn()} />);

    await user.click(screen.getByLabelText(/push image to registry/i));

    expect(screen.getByLabelText(/registry url/i)).toBeInTheDocument();
  });

  it("shows validation error when tag is empty on submit", async () => {
    const user = userEvent.setup();
    render(<BuildStageCard onSave={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /add build stage/i }));

    await waitFor(() => {
      expect(screen.getByText("Image tag is required")).toBeInTheDocument();
    });
  });

  it("calls onSave with form values when submitted successfully", async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn();
    render(<BuildStageCard onSave={mockSave} />);

    // Use a simple tag without special characters to avoid userEvent brace escaping
    await user.type(screen.getByLabelText(/image tag/i), "v1.0.0");
    await user.click(screen.getByRole("button", { name: /add build stage/i }));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledOnce();
    });

    const [values] = mockSave.mock.calls[0] as [{ engine: string; tag: string; push: boolean }];
    expect(values).toMatchObject({
      engine: "docker",
      tag: "v1.0.0",
      dockerfile: "Dockerfile",
      context: ".",
      push: false,
    });
  });

  it("calls onSave with registry when push is enabled and registry is filled", async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn();
    render(<BuildStageCard onSave={mockSave} />);

    await user.type(screen.getByLabelText(/image tag/i), "v1.0.0");
    await user.click(screen.getByLabelText(/push image to registry/i));
    await user.type(screen.getByLabelText(/registry url/i), "https://registry.example.com");

    await user.click(screen.getByRole("button", { name: /add build stage/i }));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledOnce();
    });

    const [values] = mockSave.mock.calls[0] as [{ registry: string }[]];
    expect(values).toMatchObject({
      tag: "v1.0.0",
      push: true,
      registry: "https://registry.example.com",
    });
  });

  it("shows a registry validation error for invalid URL", async () => {
    const user = userEvent.setup();
    render(<BuildStageCard onSave={vi.fn()} />);

    await user.type(screen.getByLabelText(/image tag/i), "{{commitSha}}");
    await user.click(screen.getByLabelText(/push image to registry/i));
    await user.type(screen.getByLabelText(/registry url/i), "not-a-url");

    await user.click(screen.getByRole("button", { name: /add build stage/i }));

    await waitFor(() => {
      expect(screen.getByText("Registry must be a valid URL")).toBeInTheDocument();
    });
  });

  it("calls onCancel when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const mockCancel = vi.fn();
    render(<BuildStageCard onSave={vi.fn()} onCancel={mockCancel} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockCancel).toHaveBeenCalledOnce();
  });

  it("does not render Cancel button when onCancel is not provided", () => {
    render(<BuildStageCard onSave={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("supports changing engine to buildah", async () => {
    const user = userEvent.setup();
    const mockSave = vi.fn();
    render(<BuildStageCard onSave={mockSave} />);

    await user.selectOptions(screen.getByLabelText(/engine/i), "buildah");
    await user.type(screen.getByLabelText(/image tag/i), "latest");
    await user.click(screen.getByRole("button", { name: /add build stage/i }));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledOnce();
    });

    const [values] = mockSave.mock.calls[0] as [{ engine: string }[]];
    expect(values).toMatchObject({ engine: "buildah" });
  });
});
