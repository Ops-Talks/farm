import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// vi.mock must be hoisted before imports of the module under test
const mockListConstraintTemplates = vi.hoisted(() => vi.fn());
const mockListViolations = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  gatekeeper: {
    listConstraintTemplates: mockListConstraintTemplates,
    listViolations: mockListViolations,
  },
}));

import { ConstraintTemplateTable } from './ConstraintTemplateTable';
import type { GatekeeperConstraintTemplate, GatekeeperViolation } from '@/types/api';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const mockTemplates: GatekeeperConstraintTemplate[] = [
  {
    name: 'K8sRequiredLabels',
    group: 'constraints.gatekeeper.sh',
    enforcementAction: 'deny',
    description: 'Requires labels on all resources',
    violationCount: 2,
  },
  {
    name: 'K8sAllowedRepos',
    group: 'constraints.gatekeeper.sh',
    enforcementAction: 'warn',
    violationCount: 0,
  },
];

const mockViolations: GatekeeperViolation[] = [
  {
    kind: 'K8sRequiredLabels',
    name: 'my-deployment',
    namespace: 'default',
    message: 'Missing required label: app',
    constraint: 'require-labels',
    enforcementAction: 'deny',
  },
  {
    kind: 'K8sRequiredLabels',
    name: 'other-pod',
    namespace: 'kube-system',
    message: 'Missing required label: env',
    constraint: 'require-labels',
    enforcementAction: 'deny',
  },
];

describe('ConstraintTemplateTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton while loading', () => {
    // Both queries are pending — never resolves
    mockListConstraintTemplates.mockReturnValue(new Promise(() => {}));
    mockListViolations.mockReturnValue(new Promise(() => {}));

    renderWithClient(<ConstraintTemplateTable />);
    expect(screen.getByTestId('constraint-template-skeleton')).toBeInTheDocument();
  });

  it('shows EmptyState when templates fetch fails', async () => {
    mockListConstraintTemplates.mockRejectedValue(new Error('Network error'));
    mockListViolations.mockResolvedValue([]);

    renderWithClient(<ConstraintTemplateTable />);
    expect(await screen.findByText(/Gatekeeper Unavailable/i)).toBeInTheDocument();
  });

  it('shows "No Constraint Templates" EmptyState when templates array is empty', async () => {
    mockListConstraintTemplates.mockResolvedValue([]);
    mockListViolations.mockResolvedValue([]);

    renderWithClient(<ConstraintTemplateTable />);
    expect(await screen.findByText(/No Constraint Templates/i)).toBeInTheDocument();
  });

  it('shows list of templates with names, enforcement badges, and violation counts', async () => {
    mockListConstraintTemplates.mockResolvedValue(mockTemplates);
    mockListViolations.mockResolvedValue(mockViolations);

    renderWithClient(<ConstraintTemplateTable />);

    expect(await screen.findByText('K8sRequiredLabels')).toBeInTheDocument();
    expect(screen.getByText('K8sAllowedRepos')).toBeInTheDocument();

    // Enforcement action badges
    expect(screen.getByText('deny')).toBeInTheDocument();
    expect(screen.getByText('warn')).toBeInTheDocument();

    // Violation count badge — 2 violations filtered from mockViolations for K8sRequiredLabels
    expect(screen.getByText('2 violations')).toBeInTheDocument();
  });

  it('clicking expand button shows violations list', async () => {
    mockListConstraintTemplates.mockResolvedValue(mockTemplates);
    mockListViolations.mockResolvedValue(mockViolations);

    renderWithClient(<ConstraintTemplateTable />);
    await screen.findByText('K8sRequiredLabels');

    // Violations list should not be visible initially
    expect(screen.queryByTestId('violations-list')).not.toBeInTheDocument();

    // Click the expand button for K8sRequiredLabels
    const expandBtn = screen.getByTestId('expand-K8sRequiredLabels');
    fireEvent.click(expandBtn);

    expect(screen.getByTestId('violations-list')).toBeInTheDocument();
    expect(screen.getByText('my-deployment')).toBeInTheDocument();
    expect(screen.getByText('Missing required label: app')).toBeInTheDocument();
    expect(screen.getByText('ns: default')).toBeInTheDocument();
  });

  it('shows description when present', async () => {
    mockListConstraintTemplates.mockResolvedValue(mockTemplates);
    mockListViolations.mockResolvedValue([]);

    renderWithClient(<ConstraintTemplateTable />);
    expect(await screen.findByText('Requires labels on all resources')).toBeInTheDocument();
  });

  it('templates with zero violations show no expand button', async () => {
    mockListConstraintTemplates.mockResolvedValue(mockTemplates);
    mockListViolations.mockResolvedValue([]);

    renderWithClient(<ConstraintTemplateTable />);
    await screen.findByText('K8sAllowedRepos');

    // K8sAllowedRepos has no violations — no expand button
    expect(screen.queryByTestId('expand-K8sAllowedRepos')).not.toBeInTheDocument();
  });

  it('displays total violation count in summary line', async () => {
    mockListConstraintTemplates.mockResolvedValue(mockTemplates);
    mockListViolations.mockResolvedValue(mockViolations);

    renderWithClient(<ConstraintTemplateTable />);
    // Summary text includes total violations
    expect(
      await screen.findByText(/2 total violations/i),
    ).toBeInTheDocument();
  });
});
