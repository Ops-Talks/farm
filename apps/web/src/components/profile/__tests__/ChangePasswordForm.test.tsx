/**
 * ChangePasswordForm unit tests
 *
 * Mocks auth.changePassword from @/lib/api-client and verifies:
 *   - Form renders with three password fields
 *   - Client-side validation (min 8 chars, password match)
 *   - Success path: calls API, clears form, shows success toast
 *   - Error path: shows error toast from ApiError message
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

// ── Module mocks ─────────────────────────────────────────────────────────────

const mockChangePassword = vi.fn();

vi.mock("@/lib/api-client", () => ({
  auth: {
    changePassword: (...args: unknown[]) => mockChangePassword(...args),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: { message: string }) {
      super(Array.isArray(body.message) ? body.message.join(", ") : body.message);
      this.status = status;
      this.body = body;
      this.name = "ApiError";
    }
  },
}));

import { ChangePasswordForm } from "../ChangePasswordForm";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all three password fields", () => {
    render(<ChangePasswordForm />);

    expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change password/i })).toBeInTheDocument();
  });

  it("calls changePassword with correct data on valid submit", async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);

    render(<ChangePasswordForm />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "newpass456");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpass456");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: "oldpass123",
        newPassword: "newpass456",
        confirmPassword: "newpass456",
      });
    });
  });

  it("shows success toast and clears form after successful change", async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);

    render(<ChangePasswordForm />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "newpass456");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpass456");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Password changed successfully");
    });

    // Form should be cleared after success
    expect(screen.getByLabelText<HTMLInputElement>("Current Password").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("New Password").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Confirm New Password").value).toBe("");
  });

  it("shows error toast when changePassword throws ApiError", async () => {
    const { ApiError } = await import("@/lib/api-client") as {
      ApiError: new (status: number, body: { message: string }) => Error;
    };
    mockChangePassword.mockRejectedValueOnce(
      new ApiError(400, {
        message: "Current password is incorrect",
      } as never),
    );

    render(<ChangePasswordForm />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Current Password"), "wrongpass");
    await user.type(screen.getByLabelText("New Password"), "newpass456");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpass456");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Current password is incorrect");
    });
  });

  it("shows error toast on generic error", async () => {
    mockChangePassword.mockRejectedValueOnce(new Error("Network failure"));

    render(<ChangePasswordForm />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "newpass456");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpass456");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to change password");
    });
  });

  it("shows validation error when new password is too short", async () => {
    render(<ChangePasswordForm />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "short");
    await user.type(screen.getByLabelText("Confirm New Password"), "short");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("shows validation error when passwords do not match", async () => {
    render(<ChangePasswordForm />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Current Password"), "oldpass123");
    await user.type(screen.getByLabelText("New Password"), "newpass456");
    await user.type(screen.getByLabelText("Confirm New Password"), "different789");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("does not submit when current password is empty", async () => {
    render(<ChangePasswordForm />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("New Password"), "newpass456");
    await user.type(screen.getByLabelText("Confirm New Password"), "newpass456");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });
});
