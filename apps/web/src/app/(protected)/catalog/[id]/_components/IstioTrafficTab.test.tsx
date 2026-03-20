import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CatalogComponent, IstioMetricsTimeseries, IstioLatency } from '@/types/api';
import { ComponentKind, ComponentLifecycle } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetMetricsRps = vi.fn();
const mockGetMetricsErrorRate = vi.fn();
const mockGetMetricsLatency = vi.fn();

vi.mock('@/lib/api-client', () => ({
  istio: {
    getMetricsRps: (...args: unknown[]) => mockGetMetricsRps(...args),
    getMetricsErrorRate: (...args: unknown[]) => mockGetMetricsErrorRate(...args),
    getMetricsLatency: (...args: unknown[]) => mockGetMetricsLatency(...args),
  },
}));

import { IstioTrafficTab } from './IstioTrafficTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
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

function buildTimeseries(value = 1.5): IstioMetricsTimeseries {
  return {
    query: 'rate(istio_requests_total[1h])',
    timeseries: [
      { timestamp: 1700000000, value },
      { timestamp: 1700000060, value: value + 0.1 },
    ],
  };
}

function buildLatency(): IstioLatency {
  return {
    p50: buildTimeseries(10),
    p95: buildTimeseries(50),
    p99: buildTimeseries(120),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('IstioTrafficTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMetricsRps.mockReturnValue(new Promise(() => {}));
    mockGetMetricsErrorRate.mockReturnValue(new Promise(() => {}));
    mockGetMetricsLatency.mockReturnValue(new Promise(() => {}));
  });

  it('renders skeleton while loading', () => {
    render(<IstioTrafficTab component={testComponent} />, { wrapper: createWrapper() });
    expect(screen.getByTestId('istio-traffic-skeleton')).toBeInTheDocument();
  });

  it('renders RPS, error rate and latency cards on success', async () => {
    mockGetMetricsRps.mockResolvedValue(buildTimeseries(2.5));
    mockGetMetricsErrorRate.mockResolvedValue(buildTimeseries(0.5));
    mockGetMetricsLatency.mockResolvedValue(buildLatency());

    render(<IstioTrafficTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('istio-metric-rps')).toBeInTheDocument();
    });
    expect(screen.getByTestId('istio-metric-error-rate')).toBeInTheDocument();
    expect(screen.getByTestId('istio-metric-latency-p99')).toBeInTheDocument();
  });

  it('renders timeseries tables with data rows', async () => {
    mockGetMetricsRps.mockResolvedValue(buildTimeseries(3));
    mockGetMetricsErrorRate.mockResolvedValue(buildTimeseries(1));
    mockGetMetricsLatency.mockResolvedValue(buildLatency());

    render(<IstioTrafficTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('istio-rps-table')).toBeInTheDocument();
    });
    expect(screen.getByTestId('istio-error-rate-table')).toBeInTheDocument();
    expect(screen.getByTestId('istio-latency-p50-table')).toBeInTheDocument();
    expect(screen.getByTestId('istio-latency-p95-table')).toBeInTheDocument();
    expect(screen.getByTestId('istio-latency-p99-table')).toBeInTheDocument();
  });

  it('renders EmptyState when all queries fail (Istio not installed)', async () => {
    mockGetMetricsRps.mockRejectedValue(new Error('connect ECONNREFUSED'));
    mockGetMetricsErrorRate.mockRejectedValue(new Error('connect ECONNREFUSED'));
    mockGetMetricsLatency.mockRejectedValue(new Error('connect ECONNREFUSED'));

    render(<IstioTrafficTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Istio is not installed in this cluster/)).toBeInTheDocument();
    });
  });

  it('uses default namespace when component has no namespace', async () => {
    mockGetMetricsRps.mockResolvedValue(buildTimeseries(1));
    mockGetMetricsErrorRate.mockResolvedValue(buildTimeseries(0));
    mockGetMetricsLatency.mockResolvedValue(buildLatency());

    render(<IstioTrafficTab component={{ ...testComponent, namespace: undefined }} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGetMetricsRps).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: 'default' }),
      );
    });
  });
});
