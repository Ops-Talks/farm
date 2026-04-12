import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseQuery = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}));

vi.mock('@/lib/api-client', () => ({
  linkerd: {
    listServiceProfiles: vi.fn(),
  },
}));

import { LinkerdServiceProfileTab } from './LinkerdServiceProfileTab';
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

describe('LinkerdServiceProfileTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton while loading', () => {
    mockUseQuery.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<LinkerdServiceProfileTab component={mockComponent} />);
    expect(screen.getByTestId('linkerd-profile-skeleton')).toBeInTheDocument();
  });

  it('renders empty state when no profiles found', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<LinkerdServiceProfileTab component={mockComponent} />);
    expect(screen.getByText(/No ServiceProfiles found/i)).toBeInTheDocument();
  });

  it('renders service profile card with routes', () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          name: 'my-service.default.svc.cluster.local',
          namespace: 'default',
          routes: [
            {
              name: 'GET /users',
              condition: { pathRegex: '/users', method: 'GET' },
              isRetryable: true,
              timeout: '100ms',
            },
            {
              name: 'POST /users',
              condition: { pathRegex: '/users', method: 'POST' },
              isRetryable: false,
            },
          ],
          retryBudget: { retryRatio: 0.2, minRetriesPerSecond: 10, ttl: '10s' },
        },
      ],
    });
    render(<LinkerdServiceProfileTab component={mockComponent} />);
    expect(
      screen.getByTestId('service-profile-my-service.default.svc.cluster.local'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('route-row-GET /users')).toBeInTheDocument();
    expect(screen.getByTestId('route-row-POST /users')).toBeInTheDocument();
    expect(screen.getByText('YES')).toBeInTheDocument();
    expect(screen.getByText('100ms')).toBeInTheDocument();
  });

  it('renders retry budget info', () => {
    mockUseQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          name: 'svc.ns.svc.cluster.local',
          namespace: 'ns',
          routes: [],
          retryBudget: { retryRatio: 0.2, minRetriesPerSecond: 10, ttl: '10s' },
        },
      ],
    });
    render(<LinkerdServiceProfileTab component={mockComponent} />);
    expect(screen.getByText(/Retry budget/i)).toBeInTheDocument();
  });
});
