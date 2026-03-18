import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock next/dynamic so lazy-loaded components render synchronously in tests.
// Each tab module export is mocked to a simple stub that renders its tab name.
vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _opts?: unknown,
  ) => {
    // Return a synchronous placeholder component. We identify which tab it is
    // by inspecting the stringified loader function.
    const loaderStr = loader.toString();
    if (loaderStr.includes('CatalogAnalyticsTab')) {
      return function MockCatalogTab() {
        return <div data-testid="catalog-tab">Catalog Tab Content</div>;
      };
    }
    if (loaderStr.includes('DoraMetricsTab')) {
      return function MockDoraTab({ days }: { days?: number }) {
        return <div data-testid="dora-tab">DORA Tab Content days={days}</div>;
      };
    }
    if (loaderStr.includes('UsageReportTab')) {
      return function MockUsageTab({ days }: { days?: number }) {
        return <div data-testid="usage-tab">Usage Tab Content days={days}</div>;
      };
    }
    return function FallbackMock() {
      return <div>Dynamic Component</div>;
    };
  },
}));

import { AnalyticsPageClient } from './AnalyticsPageClient';

// ── Wrapper ────────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AnalyticsPageClient', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing and shows page header', () => {
    render(<AnalyticsPageClient />, { wrapper: createWrapper() });
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('shows the Catalog tab by default', () => {
    render(<AnalyticsPageClient />, { wrapper: createWrapper() });
    expect(screen.getByTestId('catalog-tab')).toBeInTheDocument();
  });

  it('switches to DORA tab on click', async () => {
    render(<AnalyticsPageClient />, { wrapper: createWrapper() });
    await user.click(screen.getByRole('button', { name: /DORA Metrics/i }));
    await waitFor(() => {
      expect(screen.getByTestId('dora-tab')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('catalog-tab')).not.toBeInTheDocument();
  });

  it('switches to Usage tab on click', async () => {
    render(<AnalyticsPageClient />, { wrapper: createWrapper() });
    await user.click(screen.getByRole('button', { name: /Usage/i }));
    await waitFor(() => {
      expect(screen.getByTestId('usage-tab')).toBeInTheDocument();
    });
  });

  it('period selector defaults to 30 days', () => {
    render(<AnalyticsPageClient />, { wrapper: createWrapper() });
    // The "30 days" button should be visually active (secondary variant).
    const btn30 = screen.getByRole('button', { name: /30 days/i });
    expect(btn30).toBeInTheDocument();
    // aria-pressed indicates the active selection
    expect(btn30).toHaveAttribute('aria-pressed', 'true');
  });

  it('period selector changes days value when a different period is clicked', async () => {
    render(<AnalyticsPageClient />, { wrapper: createWrapper() });

    // Switch to DORA tab so we can observe the days prop
    await user.click(screen.getByRole('button', { name: /DORA Metrics/i }));

    // Change period to 7 days
    await user.click(screen.getByRole('button', { name: /7 days/i }));

    await waitFor(() => {
      expect(screen.getByTestId('dora-tab')).toHaveTextContent('days=7');
    });

    // aria-pressed should update
    expect(screen.getByRole('button', { name: /7 days/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /30 days/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
