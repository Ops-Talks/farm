"use client";

import {
  createContext,
  useCallback,
  useContext,
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
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;

    const token = getAccessToken();
    const storedUser = sessionStorage.getItem("farm_user");

    if (token && storedUser) {
      try {
        return JSON.parse(storedUser) as User;
      } catch {
        clearTokens();
        sessionStorage.removeItem("farm_user");
      }
    }

    return null;
  });
  const isLoading = false;

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await authApi.login({ username, password });
      setTokens(res.token, res.refreshToken, res.user.username);
      sessionStorage.setItem("farm_user", JSON.stringify(res.user));
      setUser(res.user);
      router.push("/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    clearTokens();
    sessionStorage.removeItem("farm_user");
    disconnect();
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
