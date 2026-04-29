import { Suspense, type ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoadingFallback } from "@/components/shared/app-loading-fallback";
import { QueryProvider } from "@/components/query-provider";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    // QueryProvider must sit outside AuthGuard so that mutations/queries
    // triggered during auth-guard checks (e.g. token refresh) share the
    // same QueryClient as the rest of the app.
    <QueryProvider>
      <Suspense fallback={<AppLoadingFallback />}>
        <AuthGuard>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </Suspense>
    </QueryProvider>
  );
}
