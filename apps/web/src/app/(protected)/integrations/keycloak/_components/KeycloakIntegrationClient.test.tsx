import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { KeycloakCredential } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListCredentials = vi.fn();
const mockCreateCredential = vi.fn();
const mockRemoveCredential = vi.fn();
const mockKeycloakSync = vi.fn();

vi.mock('@/lib/api-client', () => ({
  auth: {
    keycloakSync: (...args: unknown[]) => mockKeycloakSync(...args),
  },
  keycloakCredentials: {
    list: (...args: unknown[]) => mockListCredentials(...args),
    create: (...args: unknown[]) => mockCreateCredential(...args),
    remove: (...args: unknown[]) => mockRemoveCredential(...args),
  },
}));

const mockUser = { roles: ['admin'], displayName: 'Admin User' };

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/contexts/organization-context', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-123' } }),
}));

// Mock navigator.clipboard — use configurable:true so userEvent can also stub it
const mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockClipboardWriteText },
  writable: true,
  configurable: true,
});

import { KeycloakIntegrationClient } from './KeycloakIntegrationClient';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function buildCredential(
  overrides: Partial<KeycloakCredential> = {},
): KeycloakCredential {
  return {
    id: 'kc-cred-1',
    orgId: 'org-123',
    name: 'Production Keycloak',
    type: 'keycloak',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('KeycloakIntegrationClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore clipboard mock — userEvent.setup() may replace navigator.clipboard
    mockClipboardWriteText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboardWriteText },
      writable: true,
      configurable: true,
    });
    mockListCredentials.mockResolvedValue([]);
    mockKeycloakSync.mockResolvedValue({ queued: true });
  });

  // 1. Empty state when no credential configured
  it('renders empty state when no credential is configured', async () => {
    mockListCredentials.mockResolvedValue([]);
    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No Keycloak SSO configured')).toBeInTheDocument();
    });
  });

  // 2. Admin sees "Configure Keycloak" form
  it('admin sees Configure Keycloak button in empty state', async () => {
    mockListCredentials.mockResolvedValue([]);
    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /configure keycloak/i }),
      ).toBeInTheDocument();
    });
  });

  // 3. Non-admin does not see "Configure Keycloak" button
  it('non-admin does not see Configure Keycloak button', async () => {
    vi.mocked(
      (await import('@/contexts/auth-context')).useAuth,
    );
    // Override mock for this test only
    vi.doMock('@/contexts/auth-context', () => ({
      useAuth: () => ({ user: { roles: ['member'], displayName: 'Member' } }),
    }));

    mockListCredentials.mockResolvedValue([]);

    // Re-import after mock override
    const { KeycloakIntegrationClient: FreshClient } = await import(
      './KeycloakIntegrationClient'
    );

    render(<FreshClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /configure keycloak/i }),
      ).not.toBeInTheDocument();
    });

    vi.doUnmock('@/contexts/auth-context');
  });

  // 4. Form validation: all fields required
  it('shows validation errors when form is submitted empty', async () => {
    const user = userEvent.setup();
    mockListCredentials.mockResolvedValue([]);
    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    // Open the form
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /configure keycloak/i }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /configure keycloak/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/keycloak configuration form/i)).toBeInTheDocument(),
    );

    // Submit without filling any field
    await user.click(screen.getByRole('button', { name: /save configuration/i }));

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Keycloak URL is required')).toBeInTheDocument();
      expect(screen.getByText('Realm is required')).toBeInTheDocument();
      expect(screen.getByText('Client ID is required')).toBeInTheDocument();
      expect(screen.getByText('Client Secret is required')).toBeInTheDocument();
    });
  });

  // 5. Form submit creates credential via api-client
  it('submits form and calls keycloakCredentials.create', async () => {
    const user = userEvent.setup();
    mockListCredentials.mockResolvedValue([]);
    mockCreateCredential.mockResolvedValue(buildCredential());

    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /configure keycloak/i }),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /configure keycloak/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/keycloak configuration form/i)).toBeInTheDocument(),
    );

    await user.type(screen.getByLabelText(/^name/i), 'Prod KC');
    await user.type(screen.getByLabelText(/keycloak url/i), 'https://auth.example.com');
    await user.type(screen.getByLabelText(/realm/i), 'master');
    await user.type(screen.getByLabelText(/client id/i), 'farm-app');
    await user.type(screen.getByLabelText(/client secret/i), 'supersecret');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /save configuration/i }));
    });

    await waitFor(() => {
      expect(mockCreateCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-123',
          name: 'Prod KC',
          keycloakUrl: 'https://auth.example.com',
          realm: 'master',
          clientId: 'farm-app',
          clientSecret: 'supersecret',
        }),
      );
    });
  });

  // 6. Delete button visible to admin, triggers ConfirmDialog
  it('shows Delete button when credential exists and admin is viewing', async () => {
    mockListCredentials.mockResolvedValue([buildCredential()]);
    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /delete keycloak configuration/i }),
      ).toBeInTheDocument();
    });
  });

  // 7. Confirm delete calls remove()
  it('calls keycloakCredentials.remove after confirming delete', async () => {
    const user = userEvent.setup();
    mockListCredentials.mockResolvedValue([buildCredential()]);
    mockRemoveCredential.mockResolvedValue(undefined);

    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /delete keycloak configuration/i }),
      ).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole('button', { name: /delete keycloak configuration/i }),
    );

    // ConfirmDialog should appear
    await waitFor(() =>
      expect(screen.getByText('Remove Keycloak Configuration')).toBeInTheDocument(),
    );

    // Click the confirm (destructive) button
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /^remove$/i }));
    });

    await waitFor(() => {
      expect(mockRemoveCredential).toHaveBeenCalledWith('kc-cred-1');
    });
  });

  // 8. Sync Now button triggers keycloakSync mutation
  it('Sync Now button triggers keycloakSync mutation', async () => {
    const user = userEvent.setup();
    mockListCredentials.mockResolvedValue([buildCredential()]);
    mockKeycloakSync.mockResolvedValue({ queued: true });

    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /sync keycloak groups now/i }),
      ).toBeInTheDocument(),
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sync keycloak groups now/i }));
    });

    await waitFor(() => {
      expect(mockKeycloakSync).toHaveBeenCalledWith('org-123');
    });
  });

  // 9. Shows success toast after successful sync
  it('shows success toast after successful sync', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    mockListCredentials.mockResolvedValue([buildCredential()]);
    mockKeycloakSync.mockResolvedValue({ queued: true });

    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /sync keycloak groups now/i }),
      ).toBeInTheDocument(),
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sync keycloak groups now/i }));
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Group sync job queued successfully',
      );
    });
  });

  // 10. Shows login URL copy button
  it('renders the login URL copy button', async () => {
    mockListCredentials.mockResolvedValue([buildCredential()]);
    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /copy login url/i }),
      ).toBeInTheDocument();
    });
  });

  // 11. Login URL contains org ID
  it('login URL includes the org ID', async () => {
    mockListCredentials.mockResolvedValue([]);
    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Enterprise login URL')).toHaveTextContent(
        'keycloakOrgId=org-123',
      );
    });
  });

  // 12. Copy button calls clipboard API
  it('copy button copies the login URL to clipboard', async () => {
    const { toast } = await import('sonner');
    mockListCredentials.mockResolvedValue([]);

    render(<KeycloakIntegrationClient />, { wrapper: createWrapper() });

    const copyBtn = await screen.findByRole('button', { name: /copy login url/i });

    await act(async () => {
      copyBtn.click();
    });

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('keycloakOrgId=org-123'),
      );
      expect(toast.success).toHaveBeenCalledWith('Login URL copied to clipboard');
    });
  });
});
