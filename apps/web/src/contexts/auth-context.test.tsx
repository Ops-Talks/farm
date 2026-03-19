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
const mockSetTokens = vi.fn();
const mockClearTokens = vi.fn();
const mockGetAccessToken = vi.fn<() => string | null>(() => null);
vi.mock("@/lib/api-client", () => ({
  auth: { login: (...args: unknown[]) => mockLogin(...args) },
  setTokens: (...args: unknown[]) => mockSetTokens(...args),
  clearTokens: () => mockClearTokens(),
  getAccessToken: () => mockGetAccessToken(),
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
    mockGetAccessToken.mockReturnValue(null);
    sessionStorage.clear();
  });

  it("should start unauthenticated", () => {
    render(
      <AuthProvider><TestConsumer /></AuthProvider>,
    );
    expect(screen.getByTestId("auth-status").textContent).toBe("unauthenticated");
    expect(screen.getByTestId("user-name").textContent).toBe("none");
  });

  it("should login and set user", async () => {
    const user = userEvent.setup();
    const loginResponse = {
      user: { id: "1", username: "admin", displayName: "Farm Admin", roles: ["admin"], email: "admin@farm.dev" },
      token: "jwt-token",
      refreshToken: "refresh-token",
    };
    mockLogin.mockResolvedValueOnce(loginResponse);

    render(
      <AuthProvider><TestConsumer /></AuthProvider>,
    );

    await act(async () => {
      await user.click(screen.getByText("Login"));
    });

    expect(mockLogin).toHaveBeenCalledWith({ username: "admin", password: "pass" });
    expect(mockSetTokens).toHaveBeenCalledWith("jwt-token", "refresh-token", "admin");
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
      user: { id: "1", username: "admin", displayName: "Admin", roles: ["admin"], email: "a@b.c" },
      token: "t", refreshToken: "r",
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

    expect(mockClearTokens).toHaveBeenCalled();
    expect(screen.getByTestId("auth-status").textContent).toBe("unauthenticated");
    expect(mockPush).toHaveBeenCalledWith("/login");
    // OTel context must be cleared on logout.
    expect(mockClearUserContext).toHaveBeenCalled();
  });

  it("should restore session from sessionStorage", () => {
    mockGetAccessToken.mockReturnValue("stored-token");
    const storedUser = JSON.stringify({
      id: "1", username: "dev", displayName: "Developer", roles: ["user"], email: "d@f.g",
    });
    vi.mocked(sessionStorage.getItem).mockImplementation((key: string) => {
      if (key === "farm_user") return storedUser;
      if (key === "farm_token") return "stored-token";
      return null;
    });

    render(
      <AuthProvider><TestConsumer /></AuthProvider>,
    );
    expect(screen.getByTestId("auth-status").textContent).toBe("authenticated");
    expect(screen.getByTestId("user-name").textContent).toBe("Developer");
  });

  it("should report hasRole correctly for non-admin", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({
      user: { id: "2", username: "dev", displayName: "Dev", roles: ["user"], email: "d@f.g" },
      token: "t", refreshToken: "r",
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
