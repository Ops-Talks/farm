/**
 * ProfileForm unit tests
 *
 * Mocks auth.getProfile and auth.updateProfile from @/lib/api-client.
 * Follows the same pattern used in CRDResourcesTab.test.tsx:
 *   - vi.mock() hoisted module mocks
 *   - render + waitFor from @testing-library/react
 *   - userEvent for interactions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import type { UserProfile } from "@/lib/api-client";

// ── Module mocks ─────────────────────────────────────────────────────────────

const mockGetProfile = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("@/lib/api-client", () => ({
  auth: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
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

// Import AFTER vi.mock so the mock is in place
import { ProfileForm } from "../ProfileForm";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_PROFILE: UserProfile = {
  id: "u1",
  username: "alice",
  email: "alice@example.com",
  displayName: "Alice Smith",
  roles: ["developer"],
  firstName: "Alice",
  lastName: "Smith",
  gender: "female",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton while profile is being fetched", () => {
    // Return a promise that never resolves so the loading state persists
    mockGetProfile.mockReturnValueOnce(new Promise(() => {}));

    render(<ProfileForm />);

    // Skeleton elements should be visible during loading
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);

    // Form inputs should NOT be visible yet
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("renders form fields once profile loads", async () => {
    mockGetProfile.mockResolvedValueOnce(MOCK_PROFILE);

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Gender")).toBeInTheDocument();
  });

  it("populates form fields with profile data", async () => {
    mockGetProfile.mockResolvedValueOnce(MOCK_PROFILE);

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    expect(screen.getByLabelText<HTMLInputElement>("First Name").value).toBe("Alice");
    expect(screen.getByLabelText<HTMLInputElement>("Last Name").value).toBe("Smith");
    expect(screen.getByLabelText<HTMLInputElement>("Email").value).toBe("alice@example.com");
    expect(screen.getByLabelText<HTMLSelectElement>("Gender").value).toBe("female");
  });

  it("shows error toast when profile fetch fails", async () => {
    mockGetProfile.mockRejectedValueOnce(new Error("Network error"));

    render(<ProfileForm />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load profile");
    });
  });

  it("calls updateProfile with form data on submit", async () => {
    mockGetProfile.mockResolvedValueOnce(MOCK_PROFILE);
    mockUpdateProfile.mockResolvedValueOnce({ ...MOCK_PROFILE, firstName: "Alicia" });

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const firstNameInput = screen.getByLabelText("First Name");

    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Alicia");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: "Alicia" }),
      );
    });
  });

  it("shows success toast after successful profile update", async () => {
    mockGetProfile.mockResolvedValueOnce(MOCK_PROFILE);
    mockUpdateProfile.mockResolvedValueOnce(MOCK_PROFILE);

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Profile updated successfully");
    });
  });

  it("shows error toast when updateProfile fails", async () => {
    mockGetProfile.mockResolvedValueOnce(MOCK_PROFILE);
    mockUpdateProfile.mockRejectedValueOnce(new Error("Server error"));

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update profile");
    });
  });

  it("shows validation error for invalid email", async () => {
    mockGetProfile.mockResolvedValueOnce({ ...MOCK_PROFILE, email: "" });

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const emailInput = screen.getByLabelText("Email");
    await user.clear(emailInput);
    await user.type(emailInput, "not-an-email");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    // After submit, react-hook-form should mark the email field as invalid
    // because "not-an-email" fails the .email() zod validation.
    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    });

    // The API must NOT have been called because validation failed
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("loads profile with missing optional fields using fallback empty values", async () => {
    mockGetProfile.mockResolvedValueOnce({
      ...MOCK_PROFILE,
      firstName: null,
      lastName: null,
      gender: null,
    });

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    expect(screen.getByLabelText<HTMLInputElement>("First Name").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Last Name").value).toBe("");
    expect(screen.getByLabelText<HTMLSelectElement>("Gender").value).toBe("");
  });

  it("shows specific ApiError message when updateProfile throws ApiError", async () => {
    const { ApiError } = await import("@/lib/api-client") as {
      ApiError: new (status: number, body: { message: string }) => Error;
    };
    mockGetProfile.mockResolvedValueOnce(MOCK_PROFILE);
    mockUpdateProfile.mockRejectedValueOnce(
      new ApiError(409, { message: "Email already in use" }),
    );

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already in use");
    });
  });

  it("shows 'Saving...' on the submit button while the update is in progress", async () => {
    mockGetProfile.mockResolvedValueOnce(MOCK_PROFILE);
    // Return a promise that never resolves to keep submitting=true
    mockUpdateProfile.mockReturnValueOnce(new Promise(() => {}));

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving\.\.\./i })).toBeDisabled();
    });
  });

  it("shows validation error when first name exceeds 100 characters", async () => {
    mockGetProfile.mockResolvedValueOnce(MOCK_PROFILE);

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const firstNameInput = screen.getByLabelText("First Name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "A".repeat(101));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/100 characters or fewer/i)).toBeInTheDocument();
    });

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("shows validation error when last name exceeds 100 characters", async () => {
    mockGetProfile.mockResolvedValueOnce(MOCK_PROFILE);

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const lastNameInput = screen.getByLabelText("Last Name");
    await user.clear(lastNameInput);
    await user.type(lastNameInput, "B".repeat(101));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/100 characters or fewer/i)).toBeInTheDocument();
    });

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("does not include gender in the payload when gender is not selected", async () => {
    mockGetProfile.mockResolvedValueOnce({ ...MOCK_PROFILE, gender: null });
    mockUpdateProfile.mockResolvedValueOnce(MOCK_PROFILE);

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalled();
    });

    const payload = mockUpdateProfile.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.gender).toBeUndefined();
  });
});
