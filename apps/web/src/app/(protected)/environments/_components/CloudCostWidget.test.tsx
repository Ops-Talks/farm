import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetCost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  cloud: {
    getCost: (...args: unknown[]) => mockGetCost(...args),
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: () => false }),
}));

vi.mock('@/contexts/organization-context', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } }),
}));

import { CloudCostWidget } from './CloudCostWidget';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CloudCostWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton while fetching', () => {
    mockGetCost.mockReturnValue(new Promise(() => {}));

    render(<CloudCostWidget />, { wrapper: createWrapper() });

    expect(screen.getByTestId('cloud-cost-widget-skeleton')).toBeInTheDocument();
  });

  it('shows empty state with link when no cost data', async () => {
    mockGetCost.mockResolvedValue([]);

    render(<CloudCostWidget />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/no cost data available/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /connect a cloud provider/i })).toBeInTheDocument();
  });

  it('renders total spend and provider breakdown', async () => {
    mockGetCost.mockResolvedValue([
      {
        provider: 'aws',
        entries: [
          { environment: 'production', cost: 150.5, currency: 'USD' },
          { environment: 'staging', cost: 50.25, currency: 'USD' },
        ],
      },
      {
        provider: 'gcp',
        entries: [
          { environment: 'production', cost: 80.0, currency: 'USD' },
        ],
      },
    ]);

    render(<CloudCostWidget />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('cloud-cost-widget')).toBeInTheDocument();
    });

    // Grand total: 150.50 + 50.25 + 80.00 = 280.75
    expect(screen.getByText('$280.75')).toBeInTheDocument();

    // Provider labels should appear in bars
    expect(screen.getByText('AWS')).toBeInTheDocument();
    expect(screen.getByText('GCP')).toBeInTheDocument();
  });

  it('renders environment breakdown table', async () => {
    mockGetCost.mockResolvedValue([
      {
        provider: 'aws',
        entries: [
          { environment: 'production', cost: 100.0, currency: 'USD' },
          { environment: 'staging', cost: 30.0, currency: 'USD' },
        ],
      },
    ]);

    render(<CloudCostWidget />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('production')).toBeInTheDocument();
    });

    expect(screen.getByText('staging')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
  });

  it('renders provider progress bars with correct aria labels', async () => {
    mockGetCost.mockResolvedValue([
      {
        provider: 'aws',
        entries: [{ environment: 'prod', cost: 200.0, currency: 'USD' }],
      },
    ]);

    render(<CloudCostWidget />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('progressbar', { name: /aws spend percentage/i })).toBeInTheDocument();
    });
  });
});
