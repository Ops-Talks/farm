import { Suspense, type ReactNode } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryProvider } from "@/components/query-provider";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    // QueryProvider must sit outside AuthGuard so that mutations/queries
    // triggered during auth-guard checks (e.g. token refresh) share the
    // same QueryClient as the rest of the app.
    <QueryProvider>
      <Suspense fallback={<div className="p-8"><Skeleton className="h-full w-full" /></div>}>
        <AuthGuard>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </Suspense>
    </QueryProvider>
  );
}
