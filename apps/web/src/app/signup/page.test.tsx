import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/signup",
  useParams: () => ({}),
  useSearchParams: () => mockSearchParams,
}));

const mockRegister = vi.fn();
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
  auth: { register: (...args: unknown[]) => mockRegister(...args) },
}));

import SignupPage from "@/app/signup/page";
import { ApiError } from "@/lib/api-client";

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders the form fields and submit button", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText(/^Username$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm password/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("validates username regex and password length", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^Username$/), "bad name!");
    await user.type(screen.getByLabelText(/^Email$/), "not-an-email");
    await user.type(screen.getByLabelText(/^Password$/), "short");
    await user.type(screen.getByLabelText(/Confirm password/), "different");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Create account" }));
    });

    expect(await screen.findByText(/Only letters, numbers/i)).toBeInTheDocument();
    expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^Username$/), "alice");
    await user.type(screen.getByLabelText(/^Email$/), "alice@example.com");
    await user.type(screen.getByLabelText(/^Password$/), "Password123");
    await user.type(screen.getByLabelText(/Confirm password/), "Different123");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Create account" }));
    });
    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it("submits valid form and redirects to /login?registered=1", async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ id: "u1", username: "alice", email: "alice@example.com" });
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^Username$/), "alice");
    await user.type(screen.getByLabelText(/^Email$/), "alice@example.com");
    await user.type(screen.getByLabelText(/^Password$/), "Password123");
    await user.type(screen.getByLabelText(/Confirm password/), "Password123");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Create account" }));
    });

    await waitFor(() => expect(mockRegister).toHaveBeenCalledOnce());
    expect(mockRegister).toHaveBeenCalledWith({
      username: "alice",
      email: "alice@example.com",
      password: "Password123",
      displayName: undefined,
    });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/login?registered=1"));
  });

  it("shows specific error on 409 conflict", async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(
      new ApiError(409, { message: "Conflict" }),
    );
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^Username$/), "alice");
    await user.type(screen.getByLabelText(/^Email$/), "alice@example.com");
    await user.type(screen.getByLabelText(/^Password$/), "Password123");
    await user.type(screen.getByLabelText(/Confirm password/), "Password123");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Create account" }));
    });
    expect(await screen.findByText(/Email or username already exists/i)).toBeInTheDocument();
  });

  it("links to login page", () => {
    render(<SignupPage />);
    const loginLink = screen.getByRole("link", { name: /Log in/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("when ?invite=<token> is present, redirects to /invitations/accept?token=<token> after registration", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("invite=tok123");
    mockRegister.mockResolvedValueOnce({ id: "u1", username: "alice", email: "alice@example.com" });
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^Username$/), "alice");
    await user.type(screen.getByLabelText(/^Email$/), "alice@example.com");
    await user.type(screen.getByLabelText(/^Password$/), "Password123");
    await user.type(screen.getByLabelText(/Confirm password/), "Password123");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Create account" }));
    });

    await waitFor(() => expect(mockRegister).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/login?"),
      ),
    );
    const callArg = mockPush.mock.calls[0][0] as string;
    expect(callArg).toContain("registered=1");
    expect(callArg).toContain("redirect=");
    expect(callArg).toContain("tok123");
  });

  it("shows concatenated array message body from ApiError", async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(
      new ApiError(400, { message: ["username must be longer", "email must be an email"] }),
    );
    render(<SignupPage />);
    await user.type(screen.getByLabelText(/^Username$/), "alice");
    await user.type(screen.getByLabelText(/^Email$/), "alice@example.com");
    await user.type(screen.getByLabelText(/^Password$/), "Password123");
    await user.type(screen.getByLabelText(/Confirm password/), "Password123");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Create account" }));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /username must be longer/i,
    );
  });
});
