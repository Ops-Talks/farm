/**
 * Tests for AcceptInvitationPage — FARM-E50
 *
 * Covers:
 *  1. Shows loading state while the accept call is in-flight
 *  2. Shows success state when invitation is accepted
 *  3. Schedules a redirect to home 3 seconds after success
 *  4. Shows error state when the accept call fails with an Error
 *  5. Shows generic error message for non-Error rejections
 *  6. Navigates to home when "Go to home" is clicked from success state
 *  7. Navigates to home when "Go to home" is clicked from error state
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAccept = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ token: "test-token-abc" }),
}));

vi.mock("@/lib/api-client", () => ({
  invitations: {
    accept: (...args: unknown[]) => mockAccept(...args),
  },
}));

// ---------------------------------------------------------------------------
// Import component under test
// ---------------------------------------------------------------------------

import AcceptInvitationPage from "@/app/(protected)/invitations/[token]/accept/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AcceptInvitationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner while accept call is in-flight", () => {
    mockAccept.mockReturnValue(new Promise(() => {}));
    render(<AcceptInvitationPage />);

    expect(screen.getByText(/accepting invitation/i)).toBeInTheDocument();
  });

  it("shows success state once invitation is accepted", async () => {
    mockAccept.mockResolvedValue({ userId: "u1" });
    render(<AcceptInvitationPage />);

    await waitFor(() => {
      expect(screen.getByText("Invitation accepted!")).toBeInTheDocument();
    });
    expect(screen.getByText(/successfully joined/i)).toBeInTheDocument();
  });

  it("schedules a redirect to home 3 seconds after success", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    mockAccept.mockResolvedValue({ userId: "u1" });
    render(<AcceptInvitationPage />);

    await waitFor(() => {
      expect(screen.getByText("Invitation accepted!")).toBeInTheDocument();
    });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000);
    setTimeoutSpy.mockRestore();
  });

  it("shows error state when accept call rejects with an Error", async () => {
    mockAccept.mockRejectedValue(new Error("Invitation has expired"));
    render(<AcceptInvitationPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to accept invitation")).toBeInTheDocument();
    });
    expect(screen.getByText("Invitation has expired")).toBeInTheDocument();
  });

  it("shows generic fallback message for non-Error rejections", async () => {
    mockAccept.mockRejectedValue("unknown error");
    render(<AcceptInvitationPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to accept invitation")).toBeInTheDocument();
    });
    expect(screen.getByText("Failed to accept invitation.")).toBeInTheDocument();
  });

  it("navigates to home when 'Go to home' is clicked from success state", async () => {
    mockAccept.mockResolvedValue({ userId: "u1" });
    render(<AcceptInvitationPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go to home/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /go to home/i }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("navigates to home when 'Go to home' is clicked from error state", async () => {
    mockAccept.mockRejectedValue(new Error("Token not found"));
    render(<AcceptInvitationPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /go to home/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /go to home/i }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
