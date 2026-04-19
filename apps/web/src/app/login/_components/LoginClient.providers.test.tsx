// LoginClient.providers.test.tsx
// Tests for FARM-S314: dynamic provider buttons fetched from GET /api/v1/auth/providers.
// This is a standalone file with its own mock setup so it does not conflict with
// the existing vi.mock("@/lib/api-client") declaration in page.test.tsx.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// vi.hoisted — variables that must be available inside hoisted vi.mock calls
// ---------------------------------------------------------------------------
const { mockGetProviders, mockLoginLdap, mockSetTokens } = vi.hoisted(() => ({
  mockGetProviders: vi.fn<[], Promise<{ providers: string[] }>>(),
  mockLoginLdap: vi.fn(),
  mockSetTokens: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    login: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    hasRole: () => false,
    logout: vi.fn(),
  }),
}));

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

// Full replacement of @/lib/api-client — keeps ApiError intact and wires up
// auth.getProviders / auth.loginLdap to the hoisted mock functions so each
// test can control the API response independently.
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
  auth: {
    // Getters ensure that each call in the component always dispatches to the
    // current mock function — even after vi.clearAllMocks() resets call history.
    get getProviders() {
      return mockGetProviders;
    },
    get loginLdap() {
      return mockLoginLdap;
    },
  },
  setTokens: mockSetTokens,
}));

vi.mock("@/lib/otel-spans", () => ({
  startSpan: vi.fn(() => ({ setAttribute: vi.fn(), end: vi.fn() })),
  recordSpan: vi.fn((_name: unknown, fn: () => unknown) => fn()),
}));

// ---------------------------------------------------------------------------
// Component under test — imported after all mocks are registered
// ---------------------------------------------------------------------------
import LoginPage from "@/app/login/page";

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("LoginPage — Dynamic providers (FARM-S314)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: only always-present providers — no GitHub / Google / LDAP.
    mockGetProviders.mockResolvedValue({ providers: ["local", "keycloak"] });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  // ── GitHub ────────────────────────────────────────────────────────────────

  it("renders the GitHub button when the API returns github in the providers list", async () => {
    mockGetProviders.mockResolvedValue({
      providers: ["local", "github", "keycloak"],
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /continue with github/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not render the GitHub button when github is absent from the providers list", async () => {
    // Default mock already returns ["local", "keycloak"] — no github.
    render(<LoginPage />);

    // Wait for the loading state to resolve before asserting absence.
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /continue with github/i })).not.toBeInTheDocument();
    });
  });

  // ── Google ────────────────────────────────────────────────────────────────

  it("renders the Google button when the API returns google in the providers list", async () => {
    mockGetProviders.mockResolvedValue({
      providers: ["local", "google", "keycloak"],
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /continue with google/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not render the Google button when google is absent from the providers list", async () => {
    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /continue with google/i })).not.toBeInTheDocument();
    });
  });

  // ── LDAP ──────────────────────────────────────────────────────────────────

  it("renders the LDAP form (username input, password input, submit button) when ldap is in the providers list", async () => {
    mockGetProviders.mockResolvedValue({
      providers: ["local", "ldap", "keycloak"],
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("LDAP username")).toBeInTheDocument();
      expect(screen.getByLabelText("LDAP password")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in with ldap/i }),
      ).toBeInTheDocument();
    });
  });

  it("does not render the LDAP form when ldap is absent from the providers list", async () => {
    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.queryByLabelText("LDAP username")).not.toBeInTheDocument();
    });
  });

  it("shows a validation error when the LDAP submit button is clicked with empty inputs", async () => {
    const user = userEvent.setup();
    mockGetProviders.mockResolvedValue({
      providers: ["local", "ldap", "keycloak"],
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in with ldap/i })).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /sign in with ldap/i }));
    });

    expect(screen.getByText("Username and password are required")).toBeInTheDocument();
  });

  it("calls auth.loginLdap with the entered credentials and redirects to /dashboard on success", async () => {
    const user = userEvent.setup();
    mockGetProviders.mockResolvedValue({
      providers: ["local", "ldap", "keycloak"],
    });
    mockLoginLdap.mockResolvedValue({
      token: "access-token-123",
      refreshToken: "refresh-token-456",
      user: { username: "ldapuser", role: "user" },
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("LDAP username")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("LDAP username"), "ldapuser");
    await user.type(screen.getByLabelText("LDAP password"), "s3cr3t");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /sign in with ldap/i }));
    });

    expect(mockLoginLdap).toHaveBeenCalledWith({
      username: "ldapuser",
      password: "s3cr3t",
    });
    expect(mockSetTokens).toHaveBeenCalledWith(
      "access-token-123",
      "refresh-token-456",
      "ldapuser",
    );
    expect(window.location.href).toBe("/dashboard");
  });

  it("shows an error message when auth.loginLdap rejects", async () => {
    const user = userEvent.setup();
    mockGetProviders.mockResolvedValue({
      providers: ["local", "ldap", "keycloak"],
    });
    mockLoginLdap.mockRejectedValue(new Error("LDAP server unreachable"));

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("LDAP username")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("LDAP username"), "ldapuser");
    await user.type(screen.getByLabelText("LDAP password"), "wrongpass");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /sign in with ldap/i }));
    });

    expect(
      screen.getByText("LDAP authentication failed. Check your credentials."),
    ).toBeInTheDocument();
    // Button should be re-enabled after the error
    expect(screen.getByRole("button", { name: /sign in with ldap/i })).not.toBeDisabled();
  });

  it("disables the LDAP submit button while the request is in-flight", async () => {
    const user = userEvent.setup();
    mockGetProviders.mockResolvedValue({
      providers: ["local", "ldap", "keycloak"],
    });

    let resolveLdap!: (v: unknown) => void;
    mockLoginLdap.mockReturnValue(new Promise((r) => { resolveLdap = r; }));

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("LDAP username")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("LDAP username"), "ldapuser");
    await user.type(screen.getByLabelText("LDAP password"), "pass");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /sign in with ldap/i }));
    });

    // While the promise is pending the button is disabled and shows the
    // loading label.
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();

    // Resolve the promise so the component can unmount cleanly.
    await act(async () => {
      resolveLdap({
        token: "t",
        refreshToken: "r",
        user: { username: "ldapuser" },
      });
    });
  });

  // ── Fallback behaviour ────────────────────────────────────────────────────

  it("falls back to local + keycloak only when the API call rejects, hiding GitHub and LDAP", async () => {
    mockGetProviders.mockRejectedValue(new Error("503 Service Unavailable"));

    render(<LoginPage />);

    // After the failed fetch the fallback list is used — neither GitHub nor
    // LDAP should be rendered, but the core form must remain operational.
    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /continue with github/i })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("LDAP username")).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login with keycloak/i })).toBeInTheDocument();
  });

  // ── All providers ─────────────────────────────────────────────────────────

  it("renders GitHub, Google, and LDAP buttons when all providers are returned", async () => {
    mockGetProviders.mockResolvedValue({
      providers: ["local", "github", "google", "ldap", "keycloak"],
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /continue with github/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByLabelText("LDAP username")).toBeInTheDocument();
    });
  });
});
