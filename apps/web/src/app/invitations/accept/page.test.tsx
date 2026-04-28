import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/invitations/accept",
  useParams: () => ({}),
  useSearchParams: () => mockSearchParams,
}));

const mockGetByToken = vi.fn();
const mockAcceptByToken = vi.fn();
vi.mock("@/lib/api-client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: { message: string | string[] }) {
      super(typeof body.message === "string" ? body.message : body.message.join(", "));
      this.status = status;
      this.body = body;
    }
  },
  invitations: {
    getByToken: (...args: unknown[]) => mockGetByToken(...args),
    acceptByToken: (...args: unknown[]) => mockAcceptByToken(...args),
  },
}));

let mockUser: { id: string; username: string } | null = null;
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: mockUser, isLoading: false }),
}));

import InvitationAcceptPage from "@/app/invitations/accept/page";
import { ApiError } from "@/lib/api-client";

const renderPage = () =>
  render(<InvitationAcceptPage />);

describe("InvitationAcceptPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockUser = null;
  });

  it("shows error when token is missing", async () => {
    renderPage();
    expect(
      await screen.findByText(/Invalid invitation link/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/missing a token/i)).toBeInTheDocument();
  });

  it("shows '410 expired' message when backend returns 410", async () => {
    mockSearchParams = new URLSearchParams({ token: "abc" });
    mockGetByToken.mockRejectedValueOnce(new ApiError(410, { message: "Gone" }));
    renderPage();
    expect(
      await screen.findByText(/no longer valid/i),
    ).toBeInTheDocument();
  });

  it("shows '404 invalid' message when backend returns 404", async () => {
    mockSearchParams = new URLSearchParams({ token: "abc" });
    mockGetByToken.mockRejectedValueOnce(new ApiError(404, { message: "Not found" }));
    renderPage();
    expect(
      await screen.findByText(/invitation link is invalid/i),
    ).toBeInTheDocument();
  });

  it("shows preview with login + signup CTAs when not authenticated", async () => {
    mockSearchParams = new URLSearchParams({ token: "abc" });
    mockGetByToken.mockResolvedValueOnce({
      orgName: "Acme",
      orgId: "org_1",
      invitedByName: "Bob",
      role: "member",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      message: "Welcome to the team!",
    });
    renderPage();
    expect(await screen.findByText(/You're invited/i)).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText(/Welcome to the team/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Log in to accept/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/login?redirect="),
    );
    expect(screen.getByRole("link", { name: /Sign up first/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/signup?invite=abc"),
    );
  });

  it("when authenticated, accepts invitation and routes to /organizations on success", async () => {
    const user = userEvent.setup();
    mockUser = { id: "u_1", username: "alice" };
    mockSearchParams = new URLSearchParams({ token: "abc" });
    mockGetByToken.mockResolvedValueOnce({
      orgName: "Acme",
      orgId: "org_1",
      invitedByName: "Bob",
      role: "member",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    mockAcceptByToken.mockResolvedValueOnce({ orgId: "org_1" });

    renderPage();
    const btn = await screen.findByRole("button", { name: /Accept invitation/i });
    await act(async () => {
      await user.click(btn);
    });
    await waitFor(() => expect(mockAcceptByToken).toHaveBeenCalledWith("abc"));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/organizations/org_1"),
    );
  });

  it("shows error toast message when accept fails with ApiError", async () => {
    const user = userEvent.setup();
    mockUser = { id: "u_1", username: "alice" };
    mockSearchParams = new URLSearchParams({ token: "abc" });
    mockGetByToken.mockResolvedValueOnce({
      orgName: "Acme",
      orgId: "org_1",
      invitedByName: "Bob",
      role: "member",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    mockAcceptByToken.mockRejectedValueOnce(
      new ApiError(409, { message: "Already a member" }),
    );

    renderPage();
    const btn = await screen.findByRole("button", { name: /Accept invitation/i });
    await act(async () => {
      await user.click(btn);
    });
    // The button should re-enable after failure (accepting state reset)
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Accept invitation/i })).not.toBeDisabled(),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows expiry date in the preview card", async () => {
    mockSearchParams = new URLSearchParams({ token: "abc" });
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    mockGetByToken.mockResolvedValueOnce({
      orgName: "Acme",
      orgId: "org_1",
      invitedByName: "Bob",
      role: "member",
      expiresAt,
    });

    renderPage();
    expect(await screen.findByText(/Expires/i)).toBeInTheDocument();
  });

  it("does not render the message block when invitation has no message", async () => {
    mockUser = { id: "u_1", username: "alice" };
    mockSearchParams = new URLSearchParams({ token: "abc" });
    mockGetByToken.mockResolvedValueOnce({
      orgName: "Acme",
      orgId: "org_1",
      invitedByName: "Bob",
      role: "member",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      // message is intentionally absent
    });

    renderPage();
    await screen.findByRole("button", { name: /Accept invitation/i });
    expect(screen.queryByText(/^Message$/i)).not.toBeInTheDocument();
  });
});
