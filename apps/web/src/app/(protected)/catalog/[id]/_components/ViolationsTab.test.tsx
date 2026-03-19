import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CatalogComponent, ResourceViolation } from '@/types/api';
import { ComponentKind, ComponentLifecycle } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListViolations = vi.fn();
const mockResolveViolation = vi.fn();

vi.mock('@/lib/api-client', () => ({
  tagPolicies: {
    listViolations: (...args: unknown[]) => mockListViolations(...args),
    resolveViolation: (...args: unknown[]) => mockResolveViolation(...args),
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: () => false }),
}));

vi.mock('@/contexts/organization-context', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } }),
}));

import { ViolationsTab } from './ViolationsTab';
import { toast } from 'sonner';

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

function buildViolation(overrides: Partial<ResourceViolation> = {}): ResourceViolation {
  return {
    id: 'viol-1',
    orgId: 'org-1',
    resourceId: 'arn:aws:ecs:us-east-1:123:service/svc',
    resourceType: 'ecs-service',
    provider: 'aws',
    missingKeys: ['farm:component', 'farm:team'],
    linkedComponentId: 'comp-1',
    detectedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ViolationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeletons initially', () => {
    mockListViolations.mockReturnValue(new Promise(() => {}));

    render(<ViolationsTab component={testComponent} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('violations-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no violations exist for the component', async () => {
    mockListViolations.mockResolvedValue({
      data: [],
      total: 0,
      skip: 0,
      take: 100,
    });

    render(<ViolationsTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('violations-empty')).toBeInTheDocument();
    });
    expect(screen.getByText(/no tag violations/i)).toBeInTheDocument();
  });

  it('shows empty state when violations exist but none match the component', async () => {
    mockListViolations.mockResolvedValue({
      data: [buildViolation({ linkedComponentId: 'comp-OTHER' })],
      total: 1,
      skip: 0,
      take: 100,
    });

    render(<ViolationsTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('violations-empty')).toBeInTheDocument();
    });
  });

  it('renders violation cards with missing keys', async () => {
    mockListViolations.mockResolvedValue({
      data: [buildViolation({ id: 'viol-1', missingKeys: ['farm:component', 'farm:team'] })],
      total: 1,
      skip: 0,
      take: 100,
    });

    render(<ViolationsTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('violation-card-viol-1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('missing-key-farm:component')).toBeInTheDocument();
    expect(screen.getByTestId('missing-key-farm:team')).toBeInTheDocument();
  });

  it('shows remediation hints panel when violations exist', async () => {
    mockListViolations.mockResolvedValue({
      data: [buildViolation()],
      total: 1,
      skip: 0,
      take: 100,
    });

    render(<ViolationsTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/suggested tag values/i)).toBeInTheDocument();
    });
    // Verify component-specific suggestions
    expect(screen.getAllByText(/farm:component/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('my-service')).toBeInTheDocument();
    expect(screen.getByText('platform-team')).toBeInTheDocument();
  });

  it('calls resolveViolation and shows success toast on Resolve click', async () => {
    const violation = buildViolation({ id: 'viol-res' });
    mockListViolations.mockResolvedValue({
      data: [violation],
      total: 1,
      skip: 0,
      take: 100,
    });
    mockResolveViolation.mockResolvedValue({
      ...violation,
      resolvedAt: new Date().toISOString(),
    });

    render(<ViolationsTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('resolve-btn-viol-res')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('resolve-btn-viol-res'));

    await waitFor(() => {
      expect(mockResolveViolation).toHaveBeenCalledWith('viol-res');
      expect(toast.success).toHaveBeenCalledWith('Violation resolved');
    });
  });

  it('shows error toast when resolve fails', async () => {
    const violation = buildViolation({ id: 'viol-err' });
    mockListViolations.mockResolvedValue({
      data: [violation],
      total: 1,
      skip: 0,
      take: 100,
    });
    mockResolveViolation.mockRejectedValue(new Error('Network error'));

    render(<ViolationsTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByTestId('resolve-btn-viol-err'));
    fireEvent.click(screen.getByTestId('resolve-btn-viol-err'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to resolve violation');
    });
  });

  it('passes resolved:false when fetching violations', async () => {
    mockListViolations.mockResolvedValue({ data: [], total: 0, skip: 0, take: 100 });

    render(<ViolationsTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockListViolations).toHaveBeenCalledWith(
        expect.objectContaining({ resolved: false }),
      );
    });
  });

  it('renders multiple violations', async () => {
    mockListViolations.mockResolvedValue({
      data: [
        buildViolation({ id: 'viol-a' }),
        buildViolation({ id: 'viol-b', missingKeys: ['farm:environment'] }),
      ],
      total: 2,
      skip: 0,
      take: 100,
    });

    render(<ViolationsTab component={testComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('violation-card-viol-a')).toBeInTheDocument();
      expect(screen.getByTestId('violation-card-viol-b')).toBeInTheDocument();
    });
  });
});
