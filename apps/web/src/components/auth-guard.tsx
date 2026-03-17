"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, requiredRole, hasRole, router]);

  // While the auth state is being read from sessionStorage (isLoading=true),
  // render nothing.  This is also what the server renders, so there is no
  // SSR/client hydration mismatch.
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return null;
  }

  return <>{children}</>;
}
