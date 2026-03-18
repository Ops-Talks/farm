import { QueryClient } from '@tanstack/react-query';

/**
 * Factory function that creates a new QueryClient with sensible defaults.
 *
 * We use a factory (rather than a singleton) so that:
 *  - Server-side rendering always gets a fresh client per request.
 *  - Tests can instantiate isolated clients that don't share cache state.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 60 s — avoids redundant network requests
        // when the user navigates back to a page they already visited.
        staleTime: 60 * 1000,
        // Retry once on failure before surfacing the error to the component.
        retry: 1,
      },
    },
  });
}
