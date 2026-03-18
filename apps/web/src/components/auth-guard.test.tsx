import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  usePathname: () => "/dashboard",
}));

const mockUseAuth = vi.fn();
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

import { AuthGuard } from "@/components/auth-guard";

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isLoading: false, hasRole: () => true,
    });
    render(<AuthGuard><div>Protected Content</div></AuthGuard>);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("should redirect to login when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false, isLoading: false, hasRole: () => false,
    });
    render(<AuthGuard><div>Protected</div></AuthGuard>);
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("should render nothing while loading", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false, isLoading: true, hasRole: () => false,
    });
    const { container } = render(<AuthGuard><div>Protected</div></AuthGuard>);
    expect(container.firstChild).toBeNull();
  });

  it("should redirect to dashboard when role is insufficient", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isLoading: false, hasRole: (r: string) => r !== "admin",
    });
    render(<AuthGuard requiredRole="admin"><div>Admin Only</div></AuthGuard>);
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("should render children when required role matches", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true, isLoading: false, hasRole: () => true,
    });
    render(<AuthGuard requiredRole="admin"><div>Admin Content</div></AuthGuard>);
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });
});
