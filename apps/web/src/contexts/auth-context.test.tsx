import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/dashboard",
}));

const mockLogin = vi.fn();
const mockGetProfile = vi.fn();
const mockLogout = vi.fn();
vi.mock("@/lib/api-client", () => ({
  auth: {
    login: (...args: unknown[]) => mockLogin(...args),
    getProfile: () => mockGetProfile(),
    logout: () => mockLogout(),
  },
}));

vi.mock("@/lib/ws-client", () => ({
  disconnect: vi.fn(),
}));

// Mock OTel context helpers so auth-context tests are not coupled to OTel.
const mockSetUserContext = vi.fn();
const mockClearUserContext = vi.fn();
vi.mock("@/lib/otel-context", () => ({
  setUserContext: (...args: unknown[]) => mockSetUserContext(...args),
  clearUserContext: () => mockClearUserContext(),
}));

function TestConsumer() {
  const { user, isAuthenticated, hasRole, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? "authenticated" : "unauthenticated"}</span>
      <span data-testid="user-name">{user?.displayName ?? "none"}</span>
      <span data-testid="has-admin">{hasRole("admin") ? "yes" : "no"}</span>
      <button onClick={() => login("admin", "pass")}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: getProfile() fails with 401 → user stays null (unauthenticated).
    mockGetProfile.mockRejectedValue(new Error("Unauthorized"));
    mockLogout.mockResolvedValue({ message: "Logged out successfully" });
    sessionStorage.clear();
  });

  it("should start unauthenticated when getProfile returns 401", async () => {
    render(
      <AuthProvider><TestConsumer /></AuthProvider>,
    );
    // Wait for the async restoreSession effect to settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByTestId("auth-status").textContent).toBe("unauthenticated");
    expect(screen.getByTestId("user-name").textContent).toBe("none");
  });

  it("should login and set user", async () => {
    const user = userEvent.setup();
    // FARM-S598: login response contains message + user (tokens are in cookies).
    const loginResponse = {
      message: "Login successful",
      user: {
        id: "1",
        username: "admin",
        displayName: "Farm Admin",
        roles: ["admin"],
        email: "admin@farm.dev",
      },
    };
    mockLogin.mockResolvedValueOnce(loginResponse);

    render(
      <AuthProvider><TestConsumer /></AuthProvider>,
    );

    await act(async () => {
      await user.click(screen.getByText("Login"));
    });

    expect(mockLogin).toHaveBeenCalledWith({ username: "admin", password: "pass" });
    // setTokens must NOT be called — tokens arrive via httpOnly cookies only.
    expect(screen.getByTestId("auth-status").textContent).toBe("authenticated");
    expect(screen.getByTestId("user-name").textContent).toBe("Farm Admin");
    expect(screen.getByTestId("has-admin").textContent).toBe("yes");
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
    // OTel user context should be set with the user's id and username.
    expect(mockSetUserContext).toHaveBeenCalledWith("1", "admin");
  });

  it("should logout and clear state", async () => {
    const user = userEvent.setup();
    const loginResponse = {
      message: "Login successful",
      user: {
        id: "1",
        username: "admin",
        displayName: "Admin",
        roles: ["admin"],
        email: "a@b.c",
      },
    };
    mockLogin.mockResolvedValueOnce(loginResponse);

    render(
      <AuthProvider><TestConsumer /></AuthProvider>,
    );

    await act(async () => {
      await user.click(screen.getByText("Login"));
    });
    expect(screen.getByTestId("auth-status").textContent).toBe("authenticated");

    await act(async () => {
      await user.click(screen.getByText("Logout"));
    });

    // The logout endpoint is called to clear httpOnly cookies server-side.
    expect(mockLogout).toHaveBeenCalled();
    expect(screen.getByTestId("auth-status").textContent).toBe("unauthenticated");
    expect(mockPush).toHaveBeenCalledWith("/login");
    // OTel context must be cleared on logout.
    expect(mockClearUserContext).toHaveBeenCalled();
  });

  it("should restore session via getProfile when the access_token cookie is valid", async () => {
    // FARM-S598: session is restored by calling getProfile() — if the
    // httpOnly access_token cookie is valid the API returns the user object.
    const storedUser = {
      id: "1",
      username: "dev",
      displayName: "Developer",
      roles: ["user"],
      email: "d@f.g",
    };
    mockGetProfile.mockResolvedValueOnce(storedUser);

    render(
      <AuthProvider><TestConsumer /></AuthProvider>,
    );

    // Wait for the async restoreSession effect to settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(screen.getByTestId("auth-status").textContent).toBe("authenticated");
    expect(screen.getByTestId("user-name").textContent).toBe("Developer");
  });

  it("should report hasRole correctly for non-admin", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      message: "Login successful",
      user: {
        id: "2",
        username: "dev",
        displayName: "Dev",
        roles: ["user"],
        email: "d@f.g",
      },
    });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>,
    );

    await act(async () => {
      await user.click(screen.getByText("Login"));
    });

    expect(screen.getByTestId("has-admin").textContent).toBe("no");
  });

  it("should throw when useAuth used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow("useAuth must be used within an AuthProvider");
    consoleSpy.mockRestore();
  });
});
