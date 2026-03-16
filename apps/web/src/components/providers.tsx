"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth-context";
import { OrganizationProvider } from "@/contexts/organization-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {/* OrganizationProvider is nested inside AuthProvider so auth tokens
            are already set when the org list fetch fires on mount */}
        <OrganizationProvider>{children}</OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
