import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockEvaluate = vi.hoisted(() => vi.fn());
const mockListResults = vi.hoisted(() => vi.fn());
const mockGetStatus = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  opa: {
    getStatus: mockGetStatus,
    evaluate: mockEvaluate,
    listResults: mockListResults,
  },
}));

import { OpaEvaluationPanel } from './OpaEvaluationPanel';
import type { CatalogComponent, OpaStoredResult } from '@/types/api';

const mockComponent: CatalogComponent = {
  id: 'comp-42',
  name: 'payment-service',
  namespace: 'payments',
  kind: 'service',
  lifecycle: 'production',
  owner: 'platform-team',
  description: '',
  tags: [],
  links: [],
  dependencies: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('OpaEvaluationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no history, status irrelevant for these tests
    mockListResults.mockResolvedValue([]);
    mockGetStatus.mockResolvedValue({ reachable: true, url: 'http://opa:8181' });
  });

  it('renders policy path input and JSON textarea', () => {
    renderWithClient(<OpaEvaluationPanel component={mockComponent} />);
    expect(screen.getByTestId('policy-path-input')).toBeInTheDocument();
    expect(screen.getByTestId('input-json-textarea')).toBeInTheDocument();
    expect(screen.getByTestId('evaluate-button')).toBeInTheDocument();
  });

  it('shows error when evaluate is clicked with empty policy path', async () => {
    renderWithClient(<OpaEvaluationPanel component={mockComponent} />);

    fireEvent.click(screen.getByTestId('evaluate-button'));

    expect(await screen.findByTestId('eval-error')).toHaveTextContent(
      'Policy path is required',
    );
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('shows error when JSON input is invalid', async () => {
    renderWithClient(<OpaEvaluationPanel component={mockComponent} />);

    fireEvent.change(screen.getByTestId('policy-path-input'), {
      target: { value: 'app/authz/allow' },
    });
    fireEvent.change(screen.getByTestId('input-json-textarea'), {
      target: { value: '{ invalid json }' },
    });
    fireEvent.click(screen.getByTestId('evaluate-button'));

    expect(await screen.findByTestId('eval-error')).toHaveTextContent(
      'Input must be valid JSON',
    );
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('successful evaluation shows allowed badge and result', async () => {
    mockEvaluate.mockResolvedValue({
      policyPath: 'app/authz/allow',
      allowed: true,
      violations: [],
    });

    renderWithClient(<OpaEvaluationPanel component={mockComponent} />);

    fireEvent.change(screen.getByTestId('policy-path-input'), {
      target: { value: 'app/authz/allow' },
    });
    fireEvent.click(screen.getByTestId('evaluate-button'));

    expect(await screen.findByTestId('eval-result')).toBeInTheDocument();
    expect(screen.getByTestId('allowed-icon')).toBeInTheDocument();
    expect(screen.getByText('Allowed')).toBeInTheDocument();
    expect(screen.queryByTestId('denied-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('violations-list')).not.toBeInTheDocument();
  });

  it('denied evaluation shows denied badge and violations list', async () => {
    mockEvaluate.mockResolvedValue({
      policyPath: 'app/authz/allow',
      allowed: false,
      violations: ['missing label: app', 'image tag must not be latest'],
    });

    renderWithClient(<OpaEvaluationPanel component={mockComponent} />);

    fireEvent.change(screen.getByTestId('policy-path-input'), {
      target: { value: 'app/authz/allow' },
    });
    fireEvent.click(screen.getByTestId('evaluate-button'));

    expect(await screen.findByTestId('eval-result')).toBeInTheDocument();
    expect(screen.getByTestId('denied-icon')).toBeInTheDocument();
    expect(screen.getByText('Denied')).toBeInTheDocument();
    expect(screen.queryByTestId('allowed-icon')).not.toBeInTheDocument();

    const violationsList = screen.getByTestId('violations-list');
    expect(violationsList).toBeInTheDocument();
    expect(violationsList).toHaveTextContent('missing label: app');
    expect(violationsList).toHaveTextContent('image tag must not be latest');
  });

  it('shows loading state while evaluating', async () => {
    // Simulate a long-running evaluation
    let resolveEval!: (v: unknown) => void;
    mockEvaluate.mockReturnValue(new Promise((resolve) => { resolveEval = resolve; }));

    renderWithClient(<OpaEvaluationPanel component={mockComponent} />);

    fireEvent.change(screen.getByTestId('policy-path-input'), {
      target: { value: 'app/authz/allow' },
    });
    fireEvent.click(screen.getByTestId('evaluate-button'));

    expect(await screen.findByText('Evaluating...')).toBeInTheDocument();
    expect(screen.getByTestId('evaluate-button')).toBeDisabled();

    // Clean up
    resolveEval({ policyPath: 'app/authz/allow', allowed: true, violations: [] });
  });

  it('shows evaluation history when available', async () => {
    const history: OpaStoredResult[] = [
      {
        id: 'res-1',
        componentId: 'comp-42',
        policyPath: 'app/security/check',
        allowed: true,
        violations: [],
        evaluatedAt: '2024-06-01T12:00:00Z',
        createdAt: '2024-06-01T12:00:00Z',
      },
      {
        id: 'res-2',
        componentId: 'comp-42',
        policyPath: 'app/rbac/deny',
        allowed: false,
        violations: ['unauthorized'],
        evaluatedAt: '2024-06-02T09:30:00Z',
        createdAt: '2024-06-02T09:30:00Z',
      },
    ];
    mockListResults.mockResolvedValue(history);

    renderWithClient(<OpaEvaluationPanel component={mockComponent} />);

    const historyContainer = await screen.findByTestId('evaluation-history');
    expect(historyContainer).toBeInTheDocument();
    expect(historyContainer).toHaveTextContent('app/security/check');
    expect(historyContainer).toHaveTextContent('app/rbac/deny');
    expect(historyContainer).toHaveTextContent('allowed');
    expect(historyContainer).toHaveTextContent('denied');
  });

  it('shows API error message when evaluation fails', async () => {
    mockEvaluate.mockRejectedValue(new Error('OPA server unreachable'));

    renderWithClient(<OpaEvaluationPanel component={mockComponent} />);

    fireEvent.change(screen.getByTestId('policy-path-input'), {
      target: { value: 'app/authz/allow' },
    });
    fireEvent.click(screen.getByTestId('evaluate-button'));

    expect(await screen.findByTestId('eval-error')).toHaveTextContent(
      'OPA server unreachable',
    );
    expect(screen.queryByTestId('eval-result')).not.toBeInTheDocument();
  });

  it('does not show evaluation history section when history is empty', async () => {
    mockListResults.mockResolvedValue([]);

    renderWithClient(<OpaEvaluationPanel component={mockComponent} />);

    // Wait for the query to settle
    await waitFor(() => expect(mockListResults).toHaveBeenCalled());
    expect(screen.queryByTestId('evaluation-history')).not.toBeInTheDocument();
  });
});
