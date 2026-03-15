import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockLogin = vi.fn();
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    hasRole: () => false,
    logout: vi.fn(),
  }),
}));

vi.mock("@/lib/api-client", () => ({
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

import LoginPage from "@/app/login/page";
import { ApiError } from "@/lib/api-client";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render login form", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByText("Farm")).toBeInTheDocument();
  });

  it("should submit form with credentials", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "Admin1234");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Sign In" }));
    });

    expect(mockLogin).toHaveBeenCalledWith("admin", "Admin1234");
  });

  it("should display error message on failed login", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(
      new ApiError(401, { statusCode: 401, timestamp: "t", path: "/login", message: "Invalid credentials" }),
    );
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Sign In" }));
    });

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("should show loading state during submission", async () => {
    const user = userEvent.setup();
    let resolveLogin: () => void;
    mockLogin.mockReturnValueOnce(new Promise<void>((r) => { resolveLogin = r; }));
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "pass");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Sign In" }));
    });

    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();

    await act(async () => { resolveLogin!(); });
  });

  it("should handle unexpected errors gracefully", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error("Network failure"));
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "pass");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Sign In" }));
    });

    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
  });
});
