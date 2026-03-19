import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { TagPolicy } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListPolicies = vi.fn();
const mockCreatePolicy = vi.fn();
const mockUpdatePolicy = vi.fn();
const mockRemovePolicy = vi.fn();
const mockExportKyverno = vi.fn();

vi.mock('@/lib/api-client', () => ({
  tagPolicies: {
    list: (...args: unknown[]) => mockListPolicies(...args),
    create: (...args: unknown[]) => mockCreatePolicy(...args),
    update: (...args: unknown[]) => mockUpdatePolicy(...args),
    remove: (...args: unknown[]) => mockRemovePolicy(...args),
    exportKyverno: (...args: unknown[]) => mockExportKyverno(...args),
  },
}));

// Default: non-admin user
let mockHasRole = vi.fn(() => false);

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: mockHasRole }),
}));

vi.mock('@/contexts/organization-context', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } }),
}));

import { PolicyListClient } from './PolicyListClient';
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

function buildPolicy(overrides: Partial<TagPolicy> = {}): TagPolicy {
  return {
    id: 'pol-1',
    orgId: 'org-1',
    resourceType: 'ecs-service',
    requiredKeys: ['farm:component', 'farm:team'],
    severity: 'error',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PolicyListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole = vi.fn(() => false);
    mockListPolicies.mockResolvedValue([]);
  });

  it('shows loading skeletons initially', () => {
    mockListPolicies.mockReturnValue(new Promise(() => {}));

    render(<PolicyListClient />, { wrapper: createWrapper() });

    expect(screen.getByTestId('policies-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no policies', async () => {
    mockListPolicies.mockResolvedValue([]);

    render(<PolicyListClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('policies-empty')).toBeInTheDocument();
    });
  });

  it('renders policy cards', async () => {
    mockListPolicies.mockResolvedValue([
      buildPolicy({ id: 'pol-1', resourceType: 'ecs-service', severity: 'error' }),
      buildPolicy({ id: 'pol-2', resourceType: 'cloud-run', severity: 'warning' }),
    ]);

    render(<PolicyListClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('policy-card-pol-1')).toBeInTheDocument();
      expect(screen.getByTestId('policy-card-pol-2')).toBeInTheDocument();
    });
    expect(screen.getByTestId('severity-badge-pol-1')).toHaveTextContent('error');
    expect(screen.getByTestId('severity-badge-pol-2')).toHaveTextContent('warning');
  });

  describe('non-admin user', () => {
    beforeEach(() => {
      mockHasRole = vi.fn(() => false);
    });

    it('hides "Add Policy" button', async () => {
      mockListPolicies.mockResolvedValue([buildPolicy()]);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => screen.getByTestId('policy-card-pol-1'));

      expect(screen.queryByTestId('add-policy-btn')).not.toBeInTheDocument();
    });

    it('hides edit and delete buttons on cards', async () => {
      mockListPolicies.mockResolvedValue([buildPolicy({ id: 'pol-1' })]);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => screen.getByTestId('policy-card-pol-1'));

      expect(screen.queryByTestId('edit-btn-pol-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-btn-pol-1')).not.toBeInTheDocument();
    });
  });

  describe('admin user', () => {
    beforeEach(() => {
      mockHasRole = vi.fn(() => true);
    });

    it('shows "Add Policy" button', async () => {
      mockListPolicies.mockResolvedValue([]);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('add-policy-btn')).toBeInTheDocument();
      });
    });

    it('shows edit and delete buttons on policy cards', async () => {
      mockListPolicies.mockResolvedValue([buildPolicy({ id: 'pol-1' })]);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('edit-btn-pol-1')).toBeInTheDocument();
        expect(screen.getByTestId('delete-btn-pol-1')).toBeInTheDocument();
      });
    });

    it('opens create modal on "Add Policy" click', async () => {
      mockListPolicies.mockResolvedValue([]);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => screen.getByTestId('add-policy-btn'));
      fireEvent.click(screen.getByTestId('add-policy-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('policy-form')).toBeInTheDocument();
      });
    });

    it('validates required fields on submit', async () => {
      mockListPolicies.mockResolvedValue([]);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => screen.getByTestId('add-policy-btn'));
      fireEvent.click(screen.getByTestId('add-policy-btn'));

      await waitFor(() => screen.getByTestId('policy-form'));

      fireEvent.click(screen.getByTestId('submit-policy-btn'));

      await waitFor(() => {
        expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('calls create API and shows toast on successful form submission', async () => {
      const newPolicy = buildPolicy({ id: 'pol-new' });
      mockListPolicies.mockResolvedValue([]);
      mockCreatePolicy.mockResolvedValue(newPolicy);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => screen.getByTestId('add-policy-btn'));
      fireEvent.click(screen.getByTestId('add-policy-btn'));

      await waitFor(() => screen.getByTestId('policy-form'));

      fireEvent.change(screen.getByLabelText(/resource type/i), {
        target: { value: 'ecs-service' },
      });
      fireEvent.change(screen.getByLabelText(/required keys/i), {
        target: { value: 'farm:component, farm:team' },
      });

      fireEvent.click(screen.getByTestId('submit-policy-btn'));

      await waitFor(() => {
        expect(mockCreatePolicy).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceType: 'ecs-service',
            requiredKeys: ['farm:component', 'farm:team'],
            orgId: 'org-1',
          }),
        );
        expect(toast.success).toHaveBeenCalledWith('Policy created');
      });
    });

    it('calls remove API and shows toast on delete confirm', async () => {
      const policy = buildPolicy({ id: 'pol-del' });
      mockListPolicies.mockResolvedValue([policy]);
      mockRemovePolicy.mockResolvedValue(undefined);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => screen.getByTestId('delete-btn-pol-del'));
      fireEvent.click(screen.getByTestId('delete-btn-pol-del'));

      // ConfirmDialog renders
      await waitFor(() => {
        expect(screen.getByText(/delete tag policy/i)).toBeInTheDocument();
      });

      // Click confirm button
      fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

      await waitFor(() => {
        expect(mockRemovePolicy).toHaveBeenCalledWith('pol-del');
        expect(toast.success).toHaveBeenCalledWith('Policy deleted');
      });
    });

    it('shows "Export YAML" button on each policy card for admin users', async () => {
      mockListPolicies.mockResolvedValue([
        buildPolicy({ id: 'pol-exp-1' }),
        buildPolicy({ id: 'pol-exp-2' }),
      ]);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('export-yaml-btn-pol-exp-1')).toBeInTheDocument();
        expect(screen.getByTestId('export-yaml-btn-pol-exp-2')).toBeInTheDocument();
      });
    });

    it('clicking "Export YAML" triggers file download via Blob + URL.createObjectURL', async () => {
      const policy = buildPolicy({ id: 'pol-dl' });
      mockListPolicies.mockResolvedValue([policy]);
      mockExportKyverno.mockResolvedValue({
        yaml: 'apiVersion: kyverno.io/v1\nkind: ClusterPolicy\n',
        filename: 'cluster-policy-pol-dl.yaml',
      });

      // Mock URL.createObjectURL / revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Track anchor clicks without recursion
      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest) => {
        const el = originalCreateElement(tag, ...rest);
        if (tag === 'a') {
          el.click = mockClick;
        }
        return el;
      });

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => screen.getByTestId('export-yaml-btn-pol-dl'));
      fireEvent.click(screen.getByTestId('export-yaml-btn-pol-dl'));

      await waitFor(() => {
        expect(mockExportKyverno).toHaveBeenCalledWith('pol-dl');
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
      });

      vi.restoreAllMocks();
    });
  });

  describe('non-admin Export YAML visibility', () => {
    beforeEach(() => {
      mockHasRole = vi.fn(() => false);
    });

    it('does not show "Export YAML" button for non-admin users', async () => {
      mockListPolicies.mockResolvedValue([buildPolicy({ id: 'pol-noexp' })]);

      render(<PolicyListClient />, { wrapper: createWrapper() });

      await waitFor(() => screen.getByTestId('policy-card-pol-noexp'));

      expect(screen.queryByTestId('export-yaml-btn-pol-noexp')).not.toBeInTheDocument();
    });
  });
});
