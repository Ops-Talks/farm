import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { UsageAnalytics } from '@/lib/api-client';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUsage = vi.fn();
const mockExportReport = vi.fn();

vi.mock('@/lib/api-client', () => ({
  analytics: {
    getUsage: (...args: unknown[]) => mockGetUsage(...args),
    exportReport: (...args: unknown[]) => mockExportReport(...args),
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: () => false }),
}));

import { UsageReportTab } from './UsageReportTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const SAMPLE_DATA: UsageAnalytics = {
  periodDays: 30,
  totalAuditEvents: 1234,
  topComponents: [
    { componentId: 'c1', componentName: 'auth-service', accessCount: 500 },
    { componentId: 'c2', componentName: 'api-gateway', accessCount: 300 },
  ],
  activeUsers: [
    { actorId: 'u1', actorUsername: 'alice', actionCount: 200 },
    { actorId: 'u2', actorUsername: 'bob', actionCount: 150 },
  ],
  actionBreakdown: [
    { action: 'component.view', count: 700 },
    { action: 'deployment.create', count: 534 },
  ],
};

const EMPTY_DATA: UsageAnalytics = {
  periodDays: 30,
  totalAuditEvents: 0,
  topComponents: [],
  activeUsers: [],
  actionBreakdown: [],
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('UsageReportTab', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows total audit events', async () => {
    mockGetUsage.mockResolvedValue(SAMPLE_DATA);
    render(<UsageReportTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      // 1234 formatted as 1,234
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });
  });

  it('shows top components table with links', async () => {
    mockGetUsage.mockResolvedValue(SAMPLE_DATA);
    render(<UsageReportTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'auth-service' })).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'auth-service' })).toHaveAttribute(
      'href',
      '/catalog/c1',
    );
    expect(screen.getByRole('link', { name: 'api-gateway' })).toHaveAttribute(
      'href',
      '/catalog/c2',
    );
  });

  it('shows active users table', async () => {
    mockGetUsage.mockResolvedValue(SAMPLE_DATA);
    render(<UsageReportTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('alice')).toBeInTheDocument();
    });

    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('export CSV button calls analytics.exportReport with correct args', async () => {
    mockGetUsage.mockResolvedValue(SAMPLE_DATA);
    mockExportReport.mockResolvedValue(undefined);

    render(<UsageReportTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Export CSV/i }));

    await waitFor(() => {
      expect(mockExportReport).toHaveBeenCalledWith('usage', 30);
    });
  });

  it('shows empty state when totalAuditEvents is 0', async () => {
    mockGetUsage.mockResolvedValue(EMPTY_DATA);
    render(<UsageReportTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No activity recorded in this period/i)).toBeInTheDocument();
    });
  });

  it('shows action breakdown items', async () => {
    mockGetUsage.mockResolvedValue(SAMPLE_DATA);
    render(<UsageReportTab days={30} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('component.view')).toBeInTheDocument();
    });

    expect(screen.getByText('deployment.create')).toBeInTheDocument();
  });
});
