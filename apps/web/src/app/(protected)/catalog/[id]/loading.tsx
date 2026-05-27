// Route-segment loading UI for the catalog component detail page.
// Shown while the RSC generates metadata and the client component hydrates.
import { Skeleton } from "@/components/ui/skeleton";

export default function ComponentDetailLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Back link + header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-1 border-b pb-px">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-t" />
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  );
}
