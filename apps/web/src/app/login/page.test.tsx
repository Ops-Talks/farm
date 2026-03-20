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

// useSearchParams is already mocked globally in setup.ts to return an empty
// URLSearchParams; individual tests override it via vi.mocked() where needed.
const mockUseSearchParams = vi.fn(() => new URLSearchParams());
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => "/login",
    useParams: () => ({}),
    useSearchParams: () => mockUseSearchParams(),
  };
});

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

// Mock OTel span helpers — tests should not depend on the OTel SDK.
const mockSpanSetAttribute = vi.fn();
const mockSpanEnd = vi.fn();
const mockStartSpan = vi.fn(() => ({
  setAttribute: mockSpanSetAttribute,
  end: mockSpanEnd,
}));
vi.mock("@/lib/otel-spans", () => ({
  startSpan: (...args: unknown[]) => mockStartSpan(...args),
  recordSpan: vi.fn((_name: unknown, fn: () => unknown) => fn()),
}));

import LoginPage from "@/app/login/page";
import { ApiError } from "@/lib/api-client";

// ── Accessibility (axe) ────────────────────────────────────────────────────────
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/matchers";
expect.extend({ toHaveNoViolations });

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

  // ── OTel span assertions ────────────────────────────────────────────────────

  it("should create an auth.login span with auth.method=local on submit", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "Admin1234");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Sign In" }));
    });

    expect(mockStartSpan).toHaveBeenCalledWith("auth.login", { "auth.method": "local" });
  });

  it("should set result=success attribute on the span after a successful login", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "pass");
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Sign In" }));
    });

    expect(mockSpanSetAttribute).toHaveBeenCalledWith("result", "success");
    expect(mockSpanEnd).toHaveBeenCalled();
  });

  it("should set result=error and error.message on the span after a failed login", async () => {
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

    expect(mockSpanSetAttribute).toHaveBeenCalledWith("result", "error");
    expect(mockSpanSetAttribute).toHaveBeenCalledWith("error.message", "Invalid credentials");
    expect(mockSpanEnd).toHaveBeenCalled();
  });

  // ── Accessibility ─────────────────────────────────────────────────────────────

  it("has no accessibility violations", async () => {
    const { container } = render(<LoginPage />);
    const results = await axe(container, {
      rules: {
        // jsdom cannot compute CSS colours so colour-contrast always false-flags
        "color-contrast": { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  }, 10000);
});

// ── Keycloak SSO tests (FARM-E41) ─────────────────────────────────────────────

describe("LoginPage — Keycloak SSO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to empty search params
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    // Reset window.location mock
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  it('renders the "Login with Keycloak" button', () => {
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: /login with keycloak/i }),
    ).toBeInTheDocument();
  });

  it("pre-fills org ID input when ?keycloakOrgId query param is present", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("keycloakOrgId=org-abc"));
    render(<LoginPage />);
    expect(screen.getByLabelText("Organisation ID")).toHaveValue("org-abc");
  });

  it("redirects to keycloak auth URL with orgId on button click", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.clear(screen.getByLabelText("Organisation ID"));
    await user.type(screen.getByLabelText("Organisation ID"), "org-test-123");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /login with keycloak/i }));
    });

    expect(window.location.href).toContain("/api/v1/auth/keycloak");
    expect(window.location.href).toContain("orgId=org-test-123");
  });

  it("shows inline error when Keycloak login is clicked with no org ID", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Clear the input to ensure it's empty
    await user.clear(screen.getByLabelText("Organisation ID"));

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /login with keycloak/i }));
    });

    expect(
      screen.getByText(/organisation id is required for keycloak login/i),
    ).toBeInTheDocument();
  });

  it("shows error banner when ?error=keycloak_not_configured is in the URL", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("error=keycloak_not_configured"),
    );
    render(<LoginPage />);

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(/keycloak sso is not configured/i);
  });

  it("does NOT show the keycloak error banner without the error param", () => {
    render(<LoginPage />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
