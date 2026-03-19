import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CloudResource } from '@/lib/api-client';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockDiscoverResources = vi.fn();

vi.mock('@/lib/api-client', () => ({
  cloud: {
    discoverResources: (...args: unknown[]) => mockDiscoverResources(...args),
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, hasRole: () => false }),
}));

vi.mock('@/contexts/organization-context', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } }),
}));

import { CloudResourcesTab } from './CloudResourcesTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function buildResource(overrides: Partial<CloudResource> = {}): CloudResource {
  return {
    provider: 'aws',
    resourceId: 'arn:aws:ecs:us-east-1:123:service/my-svc',
    resourceType: 'ecs-service',
    name: 'my-service',
    region: 'us-east-1',
    tags: { 'farm:component': 'my-component' },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CloudResourcesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no resources are discovered', async () => {
    mockDiscoverResources.mockResolvedValue([]);

    render(
      <CloudResourcesTab componentId="comp-1" componentName="my-component" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText('No cloud resources discovered')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /cloud providers/i })).toBeInTheDocument();
  });

  it('shows empty state when resources exist but none match the component', async () => {
    mockDiscoverResources.mockResolvedValue([
      buildResource({ tags: { 'farm:component': 'other-component' }, linkedComponentId: undefined }),
    ]);

    render(
      <CloudResourcesTab componentId="comp-1" componentName="my-component" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText('No cloud resources discovered')).toBeInTheDocument();
    });
  });

  it('renders resources grouped by provider', async () => {
    mockDiscoverResources.mockResolvedValue([
      buildResource({
        resourceId: 'arn:aws:ecs:us-east-1:123:service/svc-a',
        name: 'svc-a',
        provider: 'aws',
        tags: { 'farm:component': 'my-component' },
      }),
      buildResource({
        resourceId: 'projects/proj/services/svc-b',
        name: 'svc-b',
        provider: 'gcp',
        resourceType: 'cloud-run',
        region: 'us-central1',
        tags: { 'farm:component': 'my-component' },
      }),
    ]);

    render(
      <CloudResourcesTab componentId="comp-1" componentName="my-component" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText('svc-a')).toBeInTheDocument();
    });

    expect(screen.getByText('svc-b')).toBeInTheDocument();
    // Provider group headings
    expect(screen.getByRole('region', { name: /aws resources/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /gcp resources/i })).toBeInTheDocument();
  });

  it('matches resources by linkedComponentId', async () => {
    mockDiscoverResources.mockResolvedValue([
      buildResource({
        resourceId: 'res-1',
        name: 'linked-resource',
        linkedComponentId: 'comp-1',
        tags: {},
      }),
      buildResource({
        resourceId: 'res-2',
        name: 'unlinked-resource',
        linkedComponentId: 'comp-other',
        tags: {},
      }),
    ]);

    render(
      <CloudResourcesTab componentId="comp-1" componentName="my-component" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText('linked-resource')).toBeInTheDocument();
    });

    expect(screen.queryByText('unlinked-resource')).not.toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', () => {
    mockDiscoverResources.mockReturnValue(new Promise(() => {}));

    render(
      <CloudResourcesTab componentId="comp-1" componentName="my-component" />,
      { wrapper: createWrapper() },
    );

    // Skeletons rendered — no resource cards yet
    expect(screen.queryByText('No cloud resources discovered')).not.toBeInTheDocument();
    expect(screen.queryByText('my-service')).not.toBeInTheDocument();
  });

  it('renders resourceType badge', async () => {
    mockDiscoverResources.mockResolvedValue([
      buildResource({ resourceType: 'ecs-service', tags: { 'farm:component': 'my-component' } }),
    ]);

    render(
      <CloudResourcesTab componentId="comp-1" componentName="my-component" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText('ecs-service')).toBeInTheDocument();
    });
  });
});
