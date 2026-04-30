import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CatalogComponent, KyvernoPolicyReportResult } from '@/types/api';
import { ComponentKind, ComponentLifecycle } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListPolicyReports = vi.fn();

vi.mock('@/lib/api-client', () => ({
  kyverno: {
    listPolicyReports: (...args: unknown[]) => mockListPolicyReports(...args),
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

import { KyvernoPolicyTab } from './KyvernoPolicyTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const testComponent: CatalogComponent = {
  id: 'comp-1',
  name: 'my-service',
  kind: ComponentKind.SERVICE,
  owner: 'platform-team',
  lifecycle: ComponentLifecycle.PRODUCTION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function buildReport(overrides: Partial<KyvernoPolicyReportResult> = {}): KyvernoPolicyReportResult {
  return {
    name: 'polr-ns-my-service',
    namespace: 'default',
    resourceId: 'default/my-service',
    resourceType: 'k8s-deployment',
    linkedComponentId: 'comp-1',
    results: [
      {
        policy: 'disallow-latest-tag',
        rule: 'require-image-tag',
        status: 'fail',
        message: 'Image tag must not be latest.',
        severity: 'medium',
      },
    ],
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('KyvernoPolicyTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPolicyReports.mockResolvedValue([]);
  });

  it('shows loading skeleton while fetching', () => {
    mockListPolicyReports.mockReturnValue(new Promise(() => {}));

    render(<KyvernoPolicyTab component={testComponent} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('kyverno-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no violations match the component', async () => {
    mockListPolicyReports.mockResolvedValue([
      buildReport({ linkedComponentId: 'other-comp', resourceId: 'default/other-svc' }),
    ]);

    render(<KyvernoPolicyTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('kyverno-empty')).toBeInTheDocument();
    });
    expect(screen.getByText(/No policy violations found/)).toBeInTheDocument();
  });

  it('renders violation cards for failing results matched by linkedComponentId', async () => {
    mockListPolicyReports.mockResolvedValue([buildReport()]);

    render(<KyvernoPolicyTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('kyverno-report-polr-ns-my-service')).toBeInTheDocument();
    });
    expect(screen.getByText('disallow-latest-tag')).toBeInTheDocument();
    expect(screen.getByText('Image tag must not be latest.')).toBeInTheDocument();
  });

  it('filters results by resourceId containing component name (fuzzy match)', async () => {
    // No linkedComponentId, but resourceId contains component name
    mockListPolicyReports.mockResolvedValue([
      buildReport({ linkedComponentId: undefined, resourceId: 'default/my-service-pod-abc' }),
    ]);

    render(<KyvernoPolicyTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('kyverno-report-polr-ns-my-service')).toBeInTheDocument();
    });
  });

  it('groups results by PolicyReport name', async () => {
    mockListPolicyReports.mockResolvedValue([
      buildReport({ name: 'report-alpha', linkedComponentId: 'comp-1' }),
      buildReport({ name: 'report-beta', linkedComponentId: 'comp-1' }),
    ]);

    render(<KyvernoPolicyTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('kyverno-report-report-alpha')).toBeInTheDocument();
      expect(screen.getByTestId('kyverno-report-report-beta')).toBeInTheDocument();
    });
  });

  it('shows correct status badges — fail is destructive, warn is secondary, pass is default', async () => {
    mockListPolicyReports.mockResolvedValue([
      buildReport({
        results: [
          { policy: 'pol-fail', rule: 'r1', status: 'fail', message: 'msg1' },
          { policy: 'pol-warn', rule: 'r2', status: 'warn', message: 'msg2' },
          { policy: 'pol-pass', rule: 'r3', status: 'pass', message: 'msg3' },
        ],
      }),
    ]);

    render(<KyvernoPolicyTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('kyverno-status-badge-fail')).toBeInTheDocument();
      expect(screen.getByTestId('kyverno-status-badge-warn')).toBeInTheDocument();
      expect(screen.getByTestId('kyverno-status-badge-pass')).toBeInTheDocument();
    });

    expect(screen.getByTestId('kyverno-status-badge-fail')).toHaveTextContent('FAIL');
    expect(screen.getByTestId('kyverno-status-badge-warn')).toHaveTextContent('WARN');
    expect(screen.getByTestId('kyverno-status-badge-pass')).toHaveTextContent('PASS');
  });

  it('shows "X failing, Y warnings" count in the summary header', async () => {
    mockListPolicyReports.mockResolvedValue([
      buildReport({
        results: [
          { policy: 'pol-a', rule: 'r1', status: 'fail', message: 'm1' },
          { policy: 'pol-b', rule: 'r2', status: 'fail', message: 'm2' },
          { policy: 'pol-c', rule: 'r3', status: 'warn', message: 'm3' },
        ],
      }),
    ]);

    render(<KyvernoPolicyTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('kyverno-failing-count')).toHaveTextContent('2 failing');
      expect(screen.getByTestId('kyverno-warnings-count')).toHaveTextContent('1 warnings');
    });
  });

  it('handles API error gracefully — returns empty and shows empty state', async () => {
    mockListPolicyReports.mockRejectedValue(new Error('Network error'));

    render(<KyvernoPolicyTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('kyverno-empty')).toBeInTheDocument();
    });
  });

  it('does not match reports belonging to a different component', async () => {
    mockListPolicyReports.mockResolvedValue([
      buildReport({
        linkedComponentId: 'other-comp',
        resourceId: 'default/totally-different',
      }),
    ]);

    render(<KyvernoPolicyTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('kyverno-empty')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('kyverno-report-polr-ns-my-service')).not.toBeInTheDocument();
  });
});
