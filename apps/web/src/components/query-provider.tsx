'use client';

// QueryProvider wraps the protected app shell with a TanStack Query context.
// It is a Client Component because QueryClientProvider requires browser APIs
// (React context, useState for the stable client reference).
//
// Placed here (rather than root layout) so the public /login page stays
// completely free of query overhead.

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';
import type { ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // useState with an initialiser ensures we create exactly one QueryClient
  // per component mount — never on re-renders, never on every RSC evaluation.
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
