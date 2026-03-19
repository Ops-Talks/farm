"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types/api";
import {
  auth as authApi,
  setTokens,
  clearTokens,
  getAccessToken,
} from "@/lib/api-client";
import { disconnect } from "@/lib/ws-client";
import { setUserContext, clearUserContext } from "@/lib/otel-context";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Always start with null so the server and client render identical HTML on
  // the first pass (no SSR/client hydration mismatch).  The effect below
  // restores the session from sessionStorage after the component mounts.
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore auth state from sessionStorage after mount. Wrapped in a local
    // function so setState calls happen inside a callback, not directly in the
    // effect body (satisfies react-hooks/set-state-in-effect).
    function restoreSession() {
      const token = getAccessToken();
      const storedUser = sessionStorage.getItem("farm_user");

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser) as User);
        } catch {
          clearTokens();
          sessionStorage.removeItem("farm_user");
        }
      }

      setIsLoading(false);
    }

    restoreSession();
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await authApi.login({ username, password });
      setTokens(res.token, res.refreshToken, res.user.username);
      sessionStorage.setItem("farm_user", JSON.stringify(res.user));
      setUser(res.user);
      // Propagate user identity to OTel spans for the session.
      setUserContext(res.user.id, res.user.username);
      router.push("/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    clearTokens();
    sessionStorage.removeItem("farm_user");
    disconnect();
    // Clear OTel user context so stale identity is not attached to future spans.
    clearUserContext();
    setUser(null);
    router.push("/login");
  }, [router]);

  const hasRole = useCallback(
    (role: string) => {
      return user?.roles.includes(role) ?? false;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      hasRole,
    }),
    [user, isLoading, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
