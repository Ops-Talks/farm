import { Suspense, type ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoadingFallback } from "@/components/shared/app-loading-fallback";
import { OrgReadyGate } from "@/components/org-ready-gate";
import { QueryProvider } from "@/components/query-provider";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    // QueryProvider must sit outside AuthGuard so that mutations/queries
    // triggered during auth-guard checks (e.g. token refresh) share the
    // same QueryClient as the rest of the app.
    <QueryProvider>
      <Suspense fallback={<AppLoadingFallback />}>
        <AuthGuard>
          <AppShell>
            {/* OrgReadyGate blocks all page children from mounting until
                OrganizationProvider resolves the org list and writes the
                selected org id to sessionStorage. This prevents useQuery
                hooks from firing without X-Organization-Id and getting 403. */}
            <OrgReadyGate>{children}</OrgReadyGate>
          </AppShell>
        </AuthGuard>
      </Suspense>
    </QueryProvider>
  );
}
