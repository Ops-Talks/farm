import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Must be at top — vi.mock hoisting
const mockUseQuery = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}));

const mockGetMetricsRps = vi.hoisted(() => vi.fn().mockResolvedValue({ query: '', timeseries: [] }));
const mockGetMetricsErrorRate = vi.hoisted(() => vi.fn().mockResolvedValue({ query: '', timeseries: [] }));
const mockGetMetricsLatency = vi.hoisted(() => vi.fn().mockResolvedValue({ p50: null, p95: null, p99: null }));

vi.mock('@/lib/api-client', () => ({
  linkerd: {
    getMetricsRps: mockGetMetricsRps,
    getMetricsErrorRate: mockGetMetricsErrorRate,
    getMetricsLatency: mockGetMetricsLatency,
  },
}));

import { LinkerdTrafficTab } from './LinkerdTrafficTab';
import type { CatalogComponent } from '@/types/api';

const mockComponent: CatalogComponent = {
  id: 'comp-1',
  name: 'my-service',
  namespace: 'default',
  kind: 'service',
  lifecycle: 'production',
  owner: 'team-a',
  description: '',
  tags: [],
  links: [],
  dependencies: [],
  createdAt: '',
  updatedAt: '',
};

const mockTimeseries = {
  query: 'rate(request_total[1h])',
  timeseries: [{ timestamp: 1700000000, value: 1.5 }],
};

describe('LinkerdTrafficTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton while loading', () => {
    mockUseQuery.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<LinkerdTrafficTab component={mockComponent} />);
    expect(screen.getByTestId('linkerd-traffic-skeleton')).toBeInTheDocument();
  });

  it('renders empty state when all queries fail', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, isError: true, data: undefined });
    render(<LinkerdTrafficTab component={mockComponent} />);
    expect(screen.getByText(/Linkerd metrics unavailable/i)).toBeInTheDocument();
  });

  it('renders metric summary cards with data', () => {
    mockUseQuery
      .mockReturnValueOnce({ isLoading: false, isError: false, data: mockTimeseries })
      .mockReturnValueOnce({ isLoading: false, isError: false, data: mockTimeseries })
      .mockReturnValueOnce({
        isLoading: false,
        isError: false,
        data: { p50: mockTimeseries, p95: mockTimeseries, p99: mockTimeseries },
      });
    render(<LinkerdTrafficTab component={mockComponent} />);
    expect(screen.getByTestId('linkerd-metric-rps')).toBeInTheDocument();
    expect(screen.getByTestId('linkerd-metric-error-rate')).toBeInTheDocument();
    expect(screen.getByTestId('linkerd-metric-latency-p99')).toBeInTheDocument();
  });

  it('renders rps timeseries table', () => {
    mockUseQuery
      .mockReturnValueOnce({ isLoading: false, isError: false, data: mockTimeseries })
      .mockReturnValueOnce({ isLoading: false, isError: false, data: undefined })
      .mockReturnValueOnce({ isLoading: false, isError: false, data: undefined });
    render(<LinkerdTrafficTab component={mockComponent} />);
    expect(screen.getByTestId('linkerd-rps-table')).toBeInTheDocument();
  });

  it('invokes queryFn functions which call api-client methods', async () => {
    mockUseQuery.mockReturnValue({ isLoading: false, isError: false, data: undefined });
    render(<LinkerdTrafficTab component={mockComponent} />);

    const calls = mockUseQuery.mock.calls as Array<[{ queryFn: () => unknown }]>;
    await calls[0][0].queryFn();
    await calls[1][0].queryFn();
    await calls[2][0].queryFn();

    expect(mockGetMetricsRps).toHaveBeenCalledWith(
      expect.objectContaining({ deployment: 'my-service', namespace: 'default' }),
    );
    expect(mockGetMetricsErrorRate).toHaveBeenCalledWith(
      expect.objectContaining({ deployment: 'my-service' }),
    );
    expect(mockGetMetricsLatency).toHaveBeenCalledWith(
      expect.objectContaining({ deployment: 'my-service' }),
    );
  });
});
