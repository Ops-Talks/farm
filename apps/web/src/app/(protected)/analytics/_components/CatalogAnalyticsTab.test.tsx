import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CatalogAnalytics } from '@/lib/api-client';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetCatalog = vi.fn();

vi.mock('@/lib/api-client', () => ({
  analytics: {
    getCatalog: (...args: unknown[]) => mockGetCatalog(...args),
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: () => false }),
}));

import { CatalogAnalyticsTab } from './CatalogAnalyticsTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const SAMPLE_DATA: CatalogAnalytics = {
  ownershipCoverage: {
    total: 10,
    withOwner: 7,
    withoutOwner: 3,
    coveragePercent: 70,
  },
  lifecycleDistribution: [
    { lifecycle: 'production', count: 5 },
    { lifecycle: 'experimental', count: 3 },
    { lifecycle: 'deprecated', count: 2 },
  ],
  kindDistribution: [
    { kind: 'service', count: 6 },
    { kind: 'library', count: 4 },
  ],
  unownedComponents: [
    { id: 'c1', name: 'auth-service', kind: 'service' },
    { id: 'c2', name: 'cache-lib', kind: 'library' },
  ],
};

const EMPTY_DATA: CatalogAnalytics = {
  ownershipCoverage: {
    total: 0,
    withOwner: 0,
    withoutOwner: 0,
    coveragePercent: 0,
  },
  lifecycleDistribution: [],
  kindDistribution: [],
  unownedComponents: [],
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CatalogAnalyticsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows ownership coverage percentage', async () => {
    mockGetCatalog.mockResolvedValue(SAMPLE_DATA);
    render(<CatalogAnalyticsTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    // Also shows the "X of Y components have an owner" text
    expect(screen.getByText(/7 of 10 components have an owner/i)).toBeInTheDocument();
  });

  it('shows lifecycle distribution rows', async () => {
    mockGetCatalog.mockResolvedValue(SAMPLE_DATA);
    render(<CatalogAnalyticsTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('production')).toBeInTheDocument();
    });

    expect(screen.getByText('experimental')).toBeInTheDocument();
    expect(screen.getByText('deprecated')).toBeInTheDocument();
  });

  it('shows kind distribution rows', async () => {
    mockGetCatalog.mockResolvedValue(SAMPLE_DATA);
    render(<CatalogAnalyticsTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      // "service" appears in both kind distribution and unowned components table;
      // we just verify at least one instance is present.
      const serviceEls = screen.getAllByText('service');
      expect(serviceEls.length).toBeGreaterThan(0);
    });

    const libraryEls = screen.getAllByText('library');
    expect(libraryEls.length).toBeGreaterThan(0);
  });

  it('shows unowned components list with links to /catalog/:id', async () => {
    mockGetCatalog.mockResolvedValue(SAMPLE_DATA);
    render(<CatalogAnalyticsTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'auth-service' })).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: 'auth-service' });
    expect(link).toHaveAttribute('href', '/catalog/c1');

    expect(screen.getByRole('link', { name: 'cache-lib' })).toHaveAttribute('href', '/catalog/c2');
  });

  it('handles empty state when total = 0', async () => {
    mockGetCatalog.mockResolvedValue(EMPTY_DATA);
    render(<CatalogAnalyticsTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No components in catalog yet/i)).toBeInTheDocument();
    });
  });

  it('shows "No data available" when lifecycle and kind distributions are empty but catalog has components', async () => {
    mockGetCatalog.mockResolvedValue({
      ownershipCoverage: { total: 5, withOwner: 5, withoutOwner: 0, coveragePercent: 100 },
      lifecycleDistribution: [],
      kindDistribution: [],
      unownedComponents: [],
    } satisfies CatalogAnalytics);
    render(<CatalogAnalyticsTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      const noDataEls = screen.getAllByText('No data available');
      expect(noDataEls.length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.getByText(/All components have an owner/i)).toBeInTheDocument();
  });

  it('shows error state when query fails', async () => {
    mockGetCatalog.mockRejectedValue(new Error('Network error'));
    render(<CatalogAnalyticsTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Failed to load catalog analytics/i)).toBeInTheDocument();
    });
  });
});
