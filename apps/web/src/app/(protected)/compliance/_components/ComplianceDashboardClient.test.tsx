import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ComplianceSummary, ResourceViolation } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetComplianceSummary = vi.fn();
const mockListViolations = vi.fn();
const mockResolveViolation = vi.fn();
const mockTriggerAudit = vi.fn();

vi.mock('@/lib/api-client', () => ({
  tagPolicies: {
    getComplianceSummary: (...args: unknown[]) => mockGetComplianceSummary(...args),
    listViolations: (...args: unknown[]) => mockListViolations(...args),
    resolveViolation: (...args: unknown[]) => mockResolveViolation(...args),
    triggerAudit: (...args: unknown[]) => mockTriggerAudit(...args),
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: () => false }),
}));

vi.mock('@/contexts/organization-context', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } }),
}));

import { ComplianceDashboardClient } from './ComplianceDashboardClient';
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

const buildSummary = (overrides: Partial<ComplianceSummary> = {}): ComplianceSummary => ({
  totalResources: 100,
  totalViolations: 10,
  complianceRate: 90,
  byProvider: {
    aws: { total: 60, violations: 5 },
    gcp: { total: 40, violations: 5 },
  },
  byResourceType: {
    'ecs-service': { total: 30, violations: 3 },
    'cloud-run': { total: 20, violations: 2 },
  },
  ...overrides,
});

const buildViolation = (overrides: Partial<ResourceViolation> = {}): ResourceViolation => ({
  id: 'viol-1',
  orgId: 'org-1',
  resourceId: 'arn:aws:ecs:us-east-1:123:service/svc',
  resourceType: 'ecs-service',
  provider: 'aws',
  missingKeys: ['farm:component', 'farm:team'],
  detectedAt: new Date().toISOString(),
  ...overrides,
});

const makeViolationPage = (violations: ResourceViolation[], total?: number) => ({
  data: violations,
  total: total ?? violations.length,
  skip: 0,
  take: 10,
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ComplianceDashboardClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListViolations.mockResolvedValue(makeViolationPage([]));
    mockGetComplianceSummary.mockResolvedValue(buildSummary());
  });

  it('shows loading skeletons initially', () => {
    // Never resolve so we stay in loading state
    mockGetComplianceSummary.mockReturnValue(new Promise(() => {}));
    mockListViolations.mockReturnValue(new Promise(() => {}));

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    expect(screen.getByTestId('summary-skeleton')).toBeInTheDocument();
  });

  it('renders summary cards after data loads', async () => {
    mockGetComplianceSummary.mockResolvedValue(buildSummary({ complianceRate: 90 }));

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('card-compliance-rate')).toBeInTheDocument();
    });
    expect(screen.getByTestId('card-total-resources')).toBeInTheDocument();
    expect(screen.getByTestId('card-open-violations')).toBeInTheDocument();
    expect(screen.getByTestId('card-resolved-today')).toBeInTheDocument();
  });

  it('shows green badge for ≥90% compliance', async () => {
    mockGetComplianceSummary.mockResolvedValue(buildSummary({ complianceRate: 95 }));

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('shows amber badge for 70–89% compliance', async () => {
    mockGetComplianceSummary.mockResolvedValue(buildSummary({ complianceRate: 75 }));

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('At Risk')).toBeInTheDocument();
    });
  });

  it('shows red badge for <70% compliance', async () => {
    mockGetComplianceSummary.mockResolvedValue(buildSummary({ complianceRate: 50 }));

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });

  it('renders violations table rows', async () => {
    mockListViolations.mockResolvedValue(
      makeViolationPage([
        buildViolation({ id: 'viol-1', provider: 'aws' }),
        buildViolation({ id: 'viol-2', provider: 'gcp', resourceId: 'projects/p/regions/r/services/svc2', missingKeys: ['farm:team'] }),
      ], 2),
    );

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('violation-row-viol-1')).toBeInTheDocument();
      expect(screen.getByTestId('violation-row-viol-2')).toBeInTheDocument();
    });
  });

  it('shows empty state when no violations', async () => {
    mockListViolations.mockResolvedValue(makeViolationPage([]));

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('violations-empty')).toBeInTheDocument();
    });
  });

  it('calls resolveViolation and invalidates cache on Resolve click', async () => {
    const violation = buildViolation({ id: 'viol-r' });
    mockListViolations.mockResolvedValue(makeViolationPage([violation]));
    mockResolveViolation.mockResolvedValue({ ...violation, resolvedAt: new Date().toISOString() });

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('resolve-btn-viol-r')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('resolve-btn-viol-r'));

    await waitFor(() => {
      expect(mockResolveViolation).toHaveBeenCalledWith('viol-r');
      expect(toast.success).toHaveBeenCalledWith('Violation resolved');
    });
  });

  it('shows toast error when resolve fails', async () => {
    const violation = buildViolation({ id: 'viol-err' });
    mockListViolations.mockResolvedValue(makeViolationPage([violation]));
    mockResolveViolation.mockRejectedValue(new Error('network'));

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('resolve-btn-viol-err')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('resolve-btn-viol-err'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to resolve violation');
    });
  });

  it('filters by provider when filter input changes', async () => {
    mockListViolations.mockResolvedValue(makeViolationPage([]));

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('filter-provider')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('filter-provider'), { target: { value: 'aws' } });

    await waitFor(() => {
      expect(mockListViolations).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'aws' }),
      );
    });
  });

  it('"Run Audit Now" calls triggerAudit and shows success toast', async () => {
    mockTriggerAudit.mockResolvedValue({ queued: true });

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('run-audit-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('run-audit-btn'));

    await waitFor(() => {
      expect(mockTriggerAudit).toHaveBeenCalledWith('org-1');
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Audit job queued'),
      );
    });
  });

  it('"Run Audit Now" shows error toast on failure', async () => {
    mockTriggerAudit.mockRejectedValue(new Error('fail'));

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByTestId('run-audit-btn'));
    fireEvent.click(screen.getByTestId('run-audit-btn'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to trigger audit');
    });
  });

  it('renders provider breakdown progress bars', async () => {
    mockGetComplianceSummary.mockResolvedValue(buildSummary());

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /compliance by provider/i })).toBeInTheDocument();
    });
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(1);
  });

  it('renders resource-type breakdown table', async () => {
    mockGetComplianceSummary.mockResolvedValue(buildSummary());

    render(<ComplianceDashboardClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /compliance by resource type/i })).toBeInTheDocument();
    });
    expect(screen.getByText('ecs-service')).toBeInTheDocument();
  });
});
