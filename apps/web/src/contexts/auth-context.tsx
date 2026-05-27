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
import { auth as authApi } from "@/lib/api-client";
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
  // the first pass (no SSR/client hydration mismatch). The effect below
  // restores the session by calling the profile endpoint, which works because
  // the browser automatically sends the httpOnly access_token cookie.
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore auth state after mount by calling the profile endpoint.
    // If the access_token cookie is valid the API returns the user object;
    // if it is absent or expired we get a 401 and the user stays null.
    async function restoreSession() {
      try {
        const profile = await authApi.getProfile();
        // Guard against stub/mock responses that do not have the required user
        // fields. In Playwright tests a catch-all route returns {data:[]} for
        // every /api/v1/** path including /auth/profile; without this check
        // the app would treat any 200 response as a valid authenticated session.
        const raw = profile as unknown as Record<string, unknown>;
        if (
          raw &&
          typeof raw.id === "string" &&
          typeof raw.username === "string"
        ) {
          setUser(profile as unknown as User);
          setUserContext(profile.id, profile.username);
        }
      } catch {
        // 401 or network error — unauthenticated state is correct.
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await authApi.login({ username, password });
      // Tokens are delivered via httpOnly Set-Cookie — nothing to store here.
      setUser(res.user);
      // Propagate user identity to OTel spans for the session.
      setUserContext(res.user.id, res.user.username);
      router.push("/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    // Ask the server to clear the httpOnly auth cookies.
    void authApi.logout().catch(() => {
      // Best-effort: even if the request fails the client state is cleared.
    });
    sessionStorage.removeItem("farm_current_org");
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
