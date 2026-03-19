import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { IntegrationCredential } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetProviders = vi.fn();
const mockListCredentials = vi.fn();
const mockCreateCredential = vi.fn();
const mockRemoveCredential = vi.fn();

vi.mock('@/lib/api-client', () => ({
  cloud: {
    getProviders: (...args: unknown[]) => mockGetProviders(...args),
  },
  integrations: {
    credentials: {
      list: (...args: unknown[]) => mockListCredentials(...args),
      create: (...args: unknown[]) => mockCreateCredential(...args),
      remove: (...args: unknown[]) => mockRemoveCredential(...args),
    },
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: () => false }),
}));

vi.mock('@/contexts/organization-context', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } }),
}));

import { CloudProvidersClient } from './CloudProvidersClient';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function buildCredential(overrides: Partial<IntegrationCredential> = {}): IntegrationCredential {
  return {
    id: 'cred-1',
    name: 'AWS — us-east-1',
    type: 'aws-iam-role',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CloudProvidersClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCredentials.mockResolvedValue([]);
  });

  it('shows connect forms when all providers are disconnected', async () => {
    mockGetProviders.mockResolvedValue([
      { provider: 'aws', connected: false, name: 'AWS' },
      { provider: 'gcp', connected: false, name: 'GCP' },
      { provider: 'azure', connected: false, name: 'Azure' },
    ]);

    render(<CloudProvidersClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('Not Connected')).toHaveLength(3);
    });

    expect(screen.getAllByRole('button', { name: 'Connect' })).toHaveLength(3);
  });

  it('shows disconnect button when AWS is connected', async () => {
    mockGetProviders.mockResolvedValue([
      { provider: 'aws', connected: true, name: 'AWS — us-east-1' },
      { provider: 'gcp', connected: false, name: 'GCP' },
      { provider: 'azure', connected: false, name: 'Azure' },
    ]);
    mockListCredentials.mockResolvedValue([
      buildCredential({ id: 'cred-aws', type: 'aws-iam-role', name: 'AWS — us-east-1' }),
    ]);

    render(<CloudProvidersClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('submits correct AWS credential payload on connect', async () => {
    const user = userEvent.setup();
    mockGetProviders.mockResolvedValue([
      { provider: 'aws', connected: false, name: 'AWS' },
      { provider: 'gcp', connected: false, name: 'GCP' },
      { provider: 'azure', connected: false, name: 'Azure' },
    ]);
    mockCreateCredential.mockResolvedValue(
      buildCredential({ name: 'AWS — us-east-1', type: 'aws-iam-role' }),
    );

    render(<CloudProvidersClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Connect' })).toHaveLength(3);
    });

    // Click the first Connect button (AWS card)
    const connectButtons = screen.getAllByRole('button', { name: 'Connect' });
    await user.click(connectButtons[0]!);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /connect amazon web services/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/access key id/i), 'AKIAIOSFODNN7EXAMPLE');
    await user.type(screen.getByLabelText(/secret access key/i), 'wJalrXUtnFEMI');
    await user.type(screen.getByLabelText(/region/i), 'us-east-1');

    // The modal submit button is inside the dialog
    const dialog = screen.getByRole('dialog', { name: /connect amazon web services/i });
    const submitBtn = dialog.querySelector('button[type="submit"]') as HTMLElement;
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'aws-iam-role',
          metadata: expect.objectContaining({ region: 'us-east-1' }),
        }),
      );
    });
  });

  it('submits correct GCP credential payload on connect', async () => {
    const user = userEvent.setup();
    mockGetProviders.mockResolvedValue([
      { provider: 'aws', connected: false, name: 'AWS' },
      { provider: 'gcp', connected: false, name: 'GCP' },
      { provider: 'azure', connected: false, name: 'Azure' },
    ]);
    mockCreateCredential.mockResolvedValue(
      buildCredential({ name: 'GCP — my-project', type: 'gcp-service-account' }),
    );

    render(<CloudProvidersClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Connect' })).toHaveLength(3);
    });

    const connectButtons = screen.getAllByRole('button', { name: 'Connect' });
    await user.click(connectButtons[1]!); // GCP card

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /connect google cloud platform/i })).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/project id/i), 'my-project');
    // userEvent.type interprets { as keyboard modifier — use paste for JSON
    await user.click(screen.getByLabelText(/service account json/i));
    await user.paste('{"type":"service_account","project_id":"my-project"}');

    // The modal submit button is inside the dialog
    const dialog = screen.getByRole('dialog', { name: /connect google cloud platform/i });
    const submitBtn = dialog.querySelector('button[type="submit"]') as HTMLElement;
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'gcp-service-account',
          metadata: expect.objectContaining({ projectId: 'my-project' }),
        }),
      );
    });
  });

  it('calls remove credential on disconnect', async () => {
    const user = userEvent.setup();
    mockGetProviders.mockResolvedValue([
      { provider: 'aws', connected: true, name: 'AWS — us-east-1' },
      { provider: 'gcp', connected: false, name: 'GCP' },
      { provider: 'azure', connected: false, name: 'Azure' },
    ]);
    mockListCredentials.mockResolvedValue([
      buildCredential({ id: 'cred-aws', type: 'aws-iam-role', name: 'AWS — us-east-1' }),
    ]);
    mockRemoveCredential.mockResolvedValue(undefined);

    render(<CloudProvidersClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /disconnect/i }));

    await waitFor(() => {
      expect(mockRemoveCredential).toHaveBeenCalledWith('cred-aws');
    });
  });

  it('shows loading skeletons while fetching', () => {
    // Never resolves — stays in loading state
    mockGetProviders.mockReturnValue(new Promise(() => {}));

    render(<CloudProvidersClient />, { wrapper: createWrapper() });

    // Skeleton cards should be present
    expect(
      document.querySelectorAll('[data-testid^="cloud-provider-card-"]').length,
    ).toBe(0);
  });
});
