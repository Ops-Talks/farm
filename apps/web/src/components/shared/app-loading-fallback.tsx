"use client";

/**
 * AppLoadingFallback — branded Suspense placeholder for the protected layout.
 *
 * Centered on the viewport with a subtle pulse so the user knows something is
 * loading without a jarring blank screen.
 */
export function AppLoadingFallback() {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] items-center justify-center"
      aria-label="Loading"
    >
      <span className="animate-pulse text-2xl font-bold text-muted-foreground">
        Farm
      </span>
    </div>
  );
}
