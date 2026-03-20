import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CatalogComponent, IstioVirtualService } from '@/types/api';
import { ComponentKind, ComponentLifecycle } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListVirtualServices = vi.fn();
const mockPatchWeights = vi.fn();

vi.mock('@/lib/api-client', () => ({
  istio: {
    listVirtualServices: (...args: unknown[]) => mockListVirtualServices(...args),
    patchWeights: (...args: unknown[]) => mockPatchWeights(...args),
  },
}));

const mockHasRole = vi.fn();
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ hasRole: mockHasRole }),
}));

import { IstioCanaryTab } from './IstioCanaryTab';

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
  namespace: 'default',
  kind: ComponentKind.SERVICE,
  owner: 'platform-team',
  lifecycle: ComponentLifecycle.PRODUCTION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function buildVs(overrides: Partial<IstioVirtualService> = {}): IstioVirtualService {
  return {
    name: 'my-service-vs',
    namespace: 'default',
    hosts: ['my-service'],
    gateways: [],
    routes: [
      { destination: 'my-service-stable', weight: 90 },
      { destination: 'my-service-canary', weight: 10 },
    ],
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('IstioCanaryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole.mockReturnValue(false);
    mockListVirtualServices.mockResolvedValue([]);
  });

  it('renders skeleton while loading', () => {
    mockListVirtualServices.mockReturnValue(new Promise(() => {}));

    render(<IstioCanaryTab component={testComponent} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('istio-canary-skeleton')).toBeInTheDocument();
  });

  it('renders EmptyState when no VirtualServices found', async () => {
    render(<IstioCanaryTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/No VirtualServices found in this namespace/),
      ).toBeInTheDocument();
    });
  });

  it('renders VirtualService card with route weights', async () => {
    mockListVirtualServices.mockResolvedValue([buildVs()]);

    render(<IstioCanaryTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('vs-card-my-service-vs')).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('route-weight-my-service-vs-my-service-stable'),
    ).toHaveTextContent('90%');
    expect(
      screen.getByTestId('route-weight-my-service-vs-my-service-canary'),
    ).toHaveTextContent('10%');
  });

  it('shows Canary badge when VS has multiple routes', async () => {
    mockListVirtualServices.mockResolvedValue([buildVs()]);

    render(<IstioCanaryTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('canary-badge-my-service-vs')).toBeInTheDocument();
    });
  });

  it('does not show Adjust Weights button for non-admin users', async () => {
    mockHasRole.mockReturnValue(false);
    mockListVirtualServices.mockResolvedValue([buildVs()]);

    render(<IstioCanaryTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('vs-card-my-service-vs')).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId('adjust-weights-btn-my-service-vs'),
    ).not.toBeInTheDocument();
  });

  it('shows Adjust Weights button for admin users', async () => {
    mockHasRole.mockReturnValue(true);
    mockListVirtualServices.mockResolvedValue([buildVs()]);

    render(<IstioCanaryTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('adjust-weights-btn-my-service-vs')).toBeInTheDocument();
    });
  });

  it('opens dialog when admin clicks Adjust Weights', async () => {
    mockHasRole.mockReturnValue(true);
    mockListVirtualServices.mockResolvedValue([buildVs()]);
    const user = userEvent.setup();

    render(<IstioCanaryTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('adjust-weights-btn-my-service-vs')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('adjust-weights-btn-my-service-vs'));

    await waitFor(() => {
      expect(screen.getByTestId('adjust-weights-dialog')).toBeInTheDocument();
    });
  });

  it('shows readonly notice for non-admin users when VirtualServices exist', async () => {
    mockHasRole.mockReturnValue(false);
    mockListVirtualServices.mockResolvedValue([buildVs()]);

    render(<IstioCanaryTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('canary-readonly-notice')).toBeInTheDocument();
    });
  });
});
