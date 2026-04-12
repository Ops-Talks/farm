import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseQuery = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
}));

const mockListServerAuthorizations = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockListAuthorizationPolicies = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock('@/lib/api-client', () => ({
  linkerd: {
    listServerAuthorizations: mockListServerAuthorizations,
    listAuthorizationPolicies: mockListAuthorizationPolicies,
  },
}));

import { LinkerdSecurityTab } from './LinkerdSecurityTab';
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

describe('LinkerdSecurityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton while loading', () => {
    mockUseQuery.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<LinkerdSecurityTab component={mockComponent} />);
    expect(screen.getByTestId('linkerd-security-skeleton')).toBeInTheDocument();
  });

  it('always shows auto-mTLS indicator card', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<LinkerdSecurityTab component={mockComponent} />);
    expect(screen.getByTestId('linkerd-mtls-indicator')).toBeInTheDocument();
    expect(screen.getByText(/AUTO-ENABLED/i)).toBeInTheDocument();
  });

  it('shows empty state when no policies found', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<LinkerdSecurityTab component={mockComponent} />);
    expect(screen.getByText(/No Linkerd authorization policies found/i)).toBeInTheDocument();
  });

  it('renders server authorization rows', () => {
    mockUseQuery
      .mockReturnValueOnce({
        isLoading: false,
        isError: false,
        data: [
          {
            name: 'web-server-auth',
            namespace: 'default',
            server: 'web-server',
            clients: ['default/web-sa'],
          },
        ],
      })
      .mockReturnValueOnce({ isLoading: false, isError: false, data: [] });
    render(<LinkerdSecurityTab component={mockComponent} />);
    expect(screen.getByTestId('linkerd-server-auth-card')).toBeInTheDocument();
    expect(screen.getByTestId('server-auth-row-web-server-auth')).toBeInTheDocument();
  });

  it('renders authorization policy rows', () => {
    mockUseQuery
      .mockReturnValueOnce({ isLoading: false, isError: false, data: [] })
      .mockReturnValueOnce({
        isLoading: false,
        isError: false,
        data: [
          {
            name: 'my-policy',
            namespace: 'default',
            targetRef: { kind: 'Server', name: 'web' },
            requiredAuthenticationRefs: [{ name: 'mesh-tls', kind: 'MeshTLSAuthentication' }],
          },
        ],
      });
    render(<LinkerdSecurityTab component={mockComponent} />);
    expect(screen.getByTestId('linkerd-auth-policy-card')).toBeInTheDocument();
    expect(screen.getByTestId('linkerd-auth-policy-row-my-policy')).toBeInTheDocument();
  });

  it('invokes queryFn functions which call api-client methods', async () => {
    mockUseQuery.mockReturnValue({ isLoading: false, isError: false, data: [] });
    render(<LinkerdSecurityTab component={mockComponent} />);

    const calls = mockUseQuery.mock.calls as Array<[{ queryFn: () => unknown }]>;
    await calls[0][0].queryFn();
    await calls[1][0].queryFn();

    expect(mockListServerAuthorizations).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'default' }),
    );
    expect(mockListAuthorizationPolicies).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'default' }),
    );
  });
});
