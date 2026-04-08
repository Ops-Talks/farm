import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CatalogComponent, ContainerVulnerability, VulnerabilitySummary } from '@/types/api';
import { ComponentKind, ComponentLifecycle } from '@/types/api';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListVulnerabilities = vi.fn();
const mockGetVulnerabilitySummary = vi.fn();
const mockSyncVulnerabilities = vi.fn();

vi.mock('@/lib/api-client', () => ({
  registry: {
    listVulnerabilities: (...args: unknown[]) => mockListVulnerabilities(...args),
    getVulnerabilitySummary: (...args: unknown[]) => mockGetVulnerabilitySummary(...args),
    syncVulnerabilities: (...args: unknown[]) => mockSyncVulnerabilities(...args),
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: () => false }),
}));

vi.mock('@/contexts/organization-context', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } }),
}));

import { ContainerSecurityTab } from './ContainerSecurityTab';
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

const baseComponent: CatalogComponent = {
  id: 'comp-1',
  name: 'my-service',
  kind: ComponentKind.SERVICE,
  owner: 'platform-team',
  lifecycle: ComponentLifecycle.PRODUCTION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  containerImage: {
    registry: 'ecr',
    image: 'myorg/myapp',
    latestTag: '1.2.3',
  },
};

const emptySummary: VulnerabilitySummary = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  informational: 0,
  total: 0,
};

function buildVuln(overrides: Partial<ContainerVulnerability> = {}): ContainerVulnerability {
  return {
    id: 'vuln-1',
    componentId: 'comp-1',
    registry: 'ecr',
    image: 'myorg/myapp',
    tag: '1.2.3',
    severity: 'HIGH',
    cveId: 'CVE-2024-1234',
    packageName: 'openssl',
    installedVersion: '1.1.1k',
    fixedVersion: '1.1.1l',
    description: 'A test vulnerability',
    scannedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ContainerSecurityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when component.containerImage is null', () => {
    const component: CatalogComponent = { ...baseComponent, containerImage: null };
    render(<ContainerSecurityTab component={component} />, { wrapper: createWrapper() });
    expect(screen.getByTestId('no-container-image')).toBeInTheDocument();
    expect(screen.getByText(/no container image configured/i)).toBeInTheDocument();
  });

  it('renders empty state when component.containerImage is undefined', () => {
    const component: CatalogComponent = { ...baseComponent, containerImage: undefined };
    render(<ContainerSecurityTab component={component} />, { wrapper: createWrapper() });
    expect(screen.getByTestId('no-container-image')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    mockGetVulnerabilitySummary.mockReturnValue(new Promise(() => {}));
    mockListVulnerabilities.mockReturnValue(new Promise(() => {}));

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('container-security-skeleton')).toBeInTheDocument();
  });

  it('renders summary counts (critical, high, medium, low) from API response', async () => {
    const summary: VulnerabilitySummary = {
      critical: 3,
      high: 7,
      medium: 12,
      low: 5,
      informational: 1,
      total: 28,
    };
    mockGetVulnerabilitySummary.mockResolvedValue(summary);
    mockListVulnerabilities.mockResolvedValue([]);

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('summary-count-critical')).toHaveTextContent('3');
      expect(screen.getByTestId('summary-count-high')).toHaveTextContent('7');
      expect(screen.getByTestId('summary-count-medium')).toHaveTextContent('12');
      expect(screen.getByTestId('summary-count-low')).toHaveTextContent('5');
    });
  });

  it('renders CVE table rows with correct data', async () => {
    mockGetVulnerabilitySummary.mockResolvedValue(emptySummary);
    const vuln = buildVuln({
      id: 'vuln-abc',
      cveId: 'CVE-2024-9999',
      packageName: 'libssl',
      installedVersion: '1.0.0',
      fixedVersion: '1.0.1',
      severity: 'CRITICAL',
    });
    mockListVulnerabilities.mockResolvedValue([vuln]);

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('cve-row-vuln-abc')).toBeInTheDocument();
    });

    expect(screen.getByTestId('cve-id-vuln-abc')).toHaveTextContent('CVE-2024-9999');
    expect(screen.getByTestId('package-vuln-abc')).toHaveTextContent('libssl');
    expect(screen.getByTestId('installed-vuln-abc')).toHaveTextContent('1.0.0');
    expect(screen.getByTestId('fixed-vuln-abc')).toHaveTextContent('1.0.1');
    expect(screen.getByTestId('severity-badge-vuln-abc')).toHaveTextContent('CRITICAL');
  });

  it('shows "—" for missing fixedVersion', async () => {
    mockGetVulnerabilitySummary.mockResolvedValue(emptySummary);
    const vuln = buildVuln({ id: 'vuln-nf', fixedVersion: null });
    mockListVulnerabilities.mockResolvedValue([vuln]);

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('fixed-vuln-nf')).toHaveTextContent('—');
    });
  });

  it('shows "—" for missing installedVersion', async () => {
    mockGetVulnerabilitySummary.mockResolvedValue(emptySummary);
    const vuln = buildVuln({ id: 'vuln-ni', installedVersion: null });
    mockListVulnerabilities.mockResolvedValue([vuln]);

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('installed-vuln-ni')).toHaveTextContent('—');
    });
  });

  it('severity filter changes the query parameter passed to listVulnerabilities', async () => {
    mockGetVulnerabilitySummary.mockResolvedValue(emptySummary);
    mockListVulnerabilities.mockResolvedValue([]);

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('severity-filter')).toBeInTheDocument();
    });

    // Initially called without severity
    expect(mockListVulnerabilities).toHaveBeenCalledWith('comp-1', undefined);

    // Change filter to CRITICAL
    fireEvent.change(screen.getByTestId('severity-filter'), { target: { value: 'CRITICAL' } });

    await waitFor(() => {
      expect(mockListVulnerabilities).toHaveBeenCalledWith('comp-1', 'CRITICAL');
    });
  });

  it('"Sync Now" button triggers sync API call and shows success toast', async () => {
    mockGetVulnerabilitySummary.mockResolvedValue(emptySummary);
    mockListVulnerabilities.mockResolvedValue([]);
    mockSyncVulnerabilities.mockResolvedValue({ queued: true, count: 5 });

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('sync-now-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sync-now-btn'));

    await waitFor(() => {
      expect(mockSyncVulnerabilities).toHaveBeenCalledWith('comp-1');
      expect(toast.success).toHaveBeenCalledWith('Vulnerability scan queued successfully');
    });
  });

  it('shows error toast when sync fails', async () => {
    mockGetVulnerabilitySummary.mockResolvedValue(emptySummary);
    mockListVulnerabilities.mockResolvedValue([]);
    mockSyncVulnerabilities.mockRejectedValue(new Error('Network error'));

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    await waitFor(() => screen.getByTestId('sync-now-btn'));
    fireEvent.click(screen.getByTestId('sync-now-btn'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to trigger vulnerability sync');
    });
  });

  it('shows "No vulnerabilities found" empty state when list is empty', async () => {
    mockGetVulnerabilitySummary.mockResolvedValue(emptySummary);
    mockListVulnerabilities.mockResolvedValue([]);

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('vulnerabilities-empty')).toBeInTheDocument();
    });
    expect(screen.getByText(/no vulnerabilities found/i)).toBeInTheDocument();
  });

  it('renders multiple CVE rows', async () => {
    mockGetVulnerabilitySummary.mockResolvedValue(emptySummary);
    mockListVulnerabilities.mockResolvedValue([
      buildVuln({ id: 'vuln-a', cveId: 'CVE-2024-0001' }),
      buildVuln({ id: 'vuln-b', cveId: 'CVE-2024-0002', severity: 'MEDIUM' }),
    ]);

    render(<ContainerSecurityTab component={baseComponent} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('cve-row-vuln-a')).toBeInTheDocument();
      expect(screen.getByTestId('cve-row-vuln-b')).toBeInTheDocument();
    });
  });
});
