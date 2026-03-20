import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  CatalogComponent,
  IstioPeerAuthentication,
  IstioAuthorizationPolicy,
} from '@/types/api';
import { ComponentKind, ComponentLifecycle } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListPeerAuthentications = vi.fn();
const mockListAuthorizationPolicies = vi.fn();

vi.mock('@/lib/api-client', () => ({
  istio: {
    listPeerAuthentications: (...args: unknown[]) => mockListPeerAuthentications(...args),
    listAuthorizationPolicies: (...args: unknown[]) => mockListAuthorizationPolicies(...args),
  },
}));

import { IstioSecurityTab } from './IstioSecurityTab';

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

function buildPeerAuth(
  overrides: Partial<IstioPeerAuthentication> = {},
): IstioPeerAuthentication {
  return { name: 'default-pa', namespace: 'default', mtlsMode: 'STRICT', ...overrides };
}

function buildAuthPolicy(
  overrides: Partial<IstioAuthorizationPolicy> = {},
): IstioAuthorizationPolicy {
  return {
    name: 'allow-all',
    namespace: 'default',
    action: 'ALLOW',
    hasNoRules: false,
    rules: [{ from: ['cluster.local/ns/default/sa/client'] }],
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('IstioSecurityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPeerAuthentications.mockResolvedValue([]);
    mockListAuthorizationPolicies.mockResolvedValue([]);
  });

  it('renders EmptyState when no policies found', async () => {
    render(<IstioSecurityTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/No Istio security policies found in this namespace/),
      ).toBeInTheDocument();
    });
  });

  it('renders PeerAuthentication with STRICT badge', async () => {
    mockListPeerAuthentications.mockResolvedValue([buildPeerAuth({ mtlsMode: 'STRICT' })]);

    render(<IstioSecurityTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('peer-auth-row-default-pa')).toBeInTheDocument();
    });
    expect(screen.getByTestId('mtls-badge-default-pa')).toHaveTextContent('STRICT');
  });

  it('renders PeerAuthentication with PERMISSIVE badge', async () => {
    mockListPeerAuthentications.mockResolvedValue([
      buildPeerAuth({ name: 'pa-perm', mtlsMode: 'PERMISSIVE' }),
    ]);

    render(<IstioSecurityTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('mtls-badge-pa-perm')).toHaveTextContent('PERMISSIVE');
    });
  });

  it('renders PeerAuthentication with DISABLE badge', async () => {
    mockListPeerAuthentications.mockResolvedValue([
      buildPeerAuth({ name: 'pa-dis', mtlsMode: 'DISABLE' }),
    ]);

    render(<IstioSecurityTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('mtls-badge-pa-dis')).toHaveTextContent('DISABLE');
    });
  });

  it('renders AuthorizationPolicy rows in table', async () => {
    mockListAuthorizationPolicies.mockResolvedValue([buildAuthPolicy()]);

    render(<IstioSecurityTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('auth-policy-row-allow-all')).toBeInTheDocument();
    });
    expect(screen.getByTestId('auth-action-badge-allow-all')).toHaveTextContent('ALLOW');
  });

  it('shows security warning alert when a policy has hasNoRules=true', async () => {
    mockListAuthorizationPolicies.mockResolvedValue([
      buildAuthPolicy({ name: 'empty-policy', hasNoRules: true, rules: [] }),
    ]);

    render(<IstioSecurityTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('istio-security-warning')).toBeInTheDocument();
    });
    expect(screen.getByTestId('no-rules-badge-empty-policy')).toBeInTheDocument();
  });

  it('does not show security warning when all policies have rules', async () => {
    mockListAuthorizationPolicies.mockResolvedValue([buildAuthPolicy()]);

    render(<IstioSecurityTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('auth-policy-row-allow-all')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('istio-security-warning')).not.toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    mockListPeerAuthentications.mockReturnValue(new Promise(() => {}));
    mockListAuthorizationPolicies.mockReturnValue(new Promise(() => {}));

    render(<IstioSecurityTab component={testComponent} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('istio-security-skeleton')).toBeInTheDocument();
  });
});
