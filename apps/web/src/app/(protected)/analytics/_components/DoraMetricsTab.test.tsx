import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { DoraAnalytics } from '@/lib/api-client';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetDora = vi.fn();

vi.mock('@/lib/api-client', () => ({
  analytics: {
    getDora: (...args: unknown[]) => mockGetDora(...args),
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: () => false }),
}));

import { DoraMetricsTab } from './DoraMetricsTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function buildDoraData(overrides: Partial<DoraAnalytics> = {}): DoraAnalytics {
  return {
    periodDays: 30,
    deploymentFrequency: { deploymentsPerDay: 1.5, total: 45, periodDays: 30 },
    changeFailureRate: { rate: 0.03, failed: 1, total: 45 },
    meanTimeToRecovery: { avgHours: 2.5, samples: 3 },
    leadTimeForChanges: { avgHours: 8.0, samples: 45 },
    ...overrides,
  };
}

const ALL_ZERO: DoraAnalytics = {
  periodDays: 30,
  deploymentFrequency: { deploymentsPerDay: 0, total: 0, periodDays: 30 },
  changeFailureRate: { rate: 0, failed: 0, total: 0 },
  meanTimeToRecovery: { avgHours: 0, samples: 0 },
  leadTimeForChanges: { avgHours: 0, samples: 0 },
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('DoraMetricsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows all 4 metric cards', async () => {
    mockGetDora.mockResolvedValue(buildDoraData());
    render(<DoraMetricsTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Deployment Frequency')).toBeInTheDocument();
    });

    expect(screen.getByText('Change Failure Rate')).toBeInTheDocument();
    expect(screen.getByText('Mean Time to Recovery')).toBeInTheDocument();
    expect(screen.getByText('Lead Time for Changes')).toBeInTheDocument();
  });

  it('shows change failure rate with green colour when < 5%', async () => {
    // rate = 0.03 → 3.0% → green
    mockGetDora.mockResolvedValue(buildDoraData({ changeFailureRate: { rate: 0.03, failed: 1, total: 33 } }));
    render(<DoraMetricsTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('3.0%')).toBeInTheDocument();
    });

    const valueEl = screen.getByText('3.0%');
    expect(valueEl.className).toMatch(/green/);
  });

  it('shows change failure rate with red colour when > 15%', async () => {
    // rate = 0.20 → 20.0% → red
    mockGetDora.mockResolvedValue(buildDoraData({ changeFailureRate: { rate: 0.20, failed: 10, total: 50 } }));
    render(<DoraMetricsTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('20.0%')).toBeInTheDocument();
    });

    const valueEl = screen.getByText('20.0%');
    expect(valueEl.className).toMatch(/red/);
  });

  it('shows change failure rate with yellow colour when between 5% and 15%', async () => {
    // rate = 0.10 → 10.0% → yellow
    mockGetDora.mockResolvedValue(buildDoraData({ changeFailureRate: { rate: 0.10, failed: 5, total: 50 } }));
    render(<DoraMetricsTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('10.0%')).toBeInTheDocument();
    });

    const valueEl = screen.getByText('10.0%');
    expect(valueEl.className).toMatch(/yellow/);
  });

  it('shows empty state when all values are zero', async () => {
    mockGetDora.mockResolvedValue(ALL_ZERO);
    render(<DoraMetricsTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No deployment data for this period/i)).toBeInTheDocument();
    });
  });

  it('passes days param to the query function', async () => {
    mockGetDora.mockResolvedValue(buildDoraData({ periodDays: 7 }));
    render(<DoraMetricsTab days={7} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGetDora).toHaveBeenCalledWith({ days: 7 });
    });
  });
});
