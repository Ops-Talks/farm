import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockTeamsCreate = vi.fn();

vi.mock("@/lib/api-client", () => ({
  teams: {
    create: (...args: unknown[]) => mockTeamsCreate(...args),
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

vi.mock("@/types/api", () => ({
  TeamType: {
    DEV: "dev",
    INFRA: "infra",
    SECURITY: "security",
    DATA: "data",
    PLATFORM: "platform",
    OTHER: "other",
  },
}));

// next/navigation is globally mocked in setup.ts

import { NewTeamClient } from "@/app/(protected)/teams/new/_components/NewTeamClient";
import { ApiError } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/name \(slug\)/i), "platform-core");
  await user.type(screen.getByLabelText(/display name/i), "Platform Core Team");
}

describe("NewTeamClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form with all fields", () => {
    render(<NewTeamClient />);
    expect(screen.getByRole("heading", { name: "Create Team" })).toBeInTheDocument();
    expect(screen.getByLabelText(/name \(slug\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Team" })).toBeInTheDocument();
  });

  it("shows validation errors when required fields are empty on submit", async () => {
    const user = userEvent.setup();
    render(<NewTeamClient />);

    await user.click(screen.getByRole("button", { name: "Create Team" }));

    await waitFor(() => {
      expect(screen.getByText("Name (slug) is required")).toBeInTheDocument();
    });
    expect(screen.getByText("Display Name is required")).toBeInTheDocument();
    expect(mockTeamsCreate).not.toHaveBeenCalled();
  });

  it("shows an email validation error for invalid contactEmail", async () => {
    const user = userEvent.setup();
    render(<NewTeamClient />);

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/contact email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Create Team" }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    });
    expect(mockTeamsCreate).not.toHaveBeenCalled();
  });

  it("calls teams.create() with correct payload and redirects on success", async () => {
    const user = userEvent.setup();
    mockTeamsCreate.mockResolvedValueOnce({
      id: "t1",
      displayName: "Platform Core Team",
    });
    render(<NewTeamClient />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Create Team" }));

    await waitFor(() => {
      expect(mockTeamsCreate).toHaveBeenCalledOnce();
    });

    expect(mockTeamsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "platform-core",
        displayName: "Platform Core Team",
      }),
    );
  });

  it("shows API error message on failure", async () => {
    const user = userEvent.setup();
    mockTeamsCreate.mockRejectedValueOnce(
      new ApiError(422, { message: "Name already taken", statusCode: 422, timestamp: "2025-01-01T00:00:00Z", path: "/test" }),
    );
    render(<NewTeamClient />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Create Team" }));

    await waitFor(() => {
      expect(screen.getByText("Name already taken")).toBeInTheDocument();
    });
  });

  it("disables the submit button while submitting", async () => {
    const user = userEvent.setup();
    let resolve: () => void;
    mockTeamsCreate.mockReturnValueOnce(
      new Promise<{ id: string; displayName: string }>((r) => {
        resolve = () => r({ id: "t1", displayName: "Platform Core Team" });
      }),
    );
    render(<NewTeamClient />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Create Team" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    });

    resolve!();
  });
});
