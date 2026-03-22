'use client';

// Main analytics page shell. Owns:
//   • tab switching state (catalog | dora | usage)
//   • period selector state (days: 7 | 30 | 90) — passed as a prop to DORA
//     and Usage tabs so they share the same window.
//
// Tab content is lazy-loaded with next/dynamic (ssr:false) to keep the initial
// JS bundle small — identical pattern to ObservabilityClient.

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { FilterTabs } from '@/components/shared/filter-tabs';

// ---------- Lazy-loaded tab bundles -------------------------------------------

const CatalogAnalyticsTab = dynamic(
  () =>
    import('./CatalogAnalyticsTab').then((m) => ({
      default: m.CatalogAnalyticsTab,
    })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-32 bg-muted rounded-md" />,
  },
);

const DoraMetricsTab = dynamic(
  () =>
    import('./DoraMetricsTab').then((m) => ({ default: m.DoraMetricsTab })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-32 bg-muted rounded-md" />,
  },
);

const UsageReportTab = dynamic(
  () =>
    import('./UsageReportTab').then((m) => ({ default: m.UsageReportTab })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-32 bg-muted rounded-md" />,
  },
);

// ---------- Types & constants -------------------------------------------------

type TabId = 'catalog' | 'dora' | 'usage';

const TABS: { id: TabId; label: string }[] = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'dora', label: 'DORA Metrics' },
  { id: 'usage', label: 'Usage' },
];

const PERIOD_OPTIONS: { label: string; value: number }[] = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

// ---------- Component ---------------------------------------------------------

export function AnalyticsPageClient() {
  const [activeTab, setActiveTab] = useState<TabId>('catalog');
  // days is passed down to DORA and Usage tabs; catalog does not need it.
  const [days, setDays] = useState<number>(30);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Catalog health, DORA engineering metrics, and platform usage insights."
      >
        {/* Period selector — only relevant for DORA / Usage tabs, but keeping
            it in the header avoids layout shift when switching tabs. */}
        <div className="flex items-center gap-1" role="group" aria-label="Select period">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={days === opt.value ? 'secondary' : 'ghost'}
              onClick={() => setDays(opt.value)}
              aria-pressed={days === opt.value}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      <FilterTabs
        tabs={TABS}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {/* Tab content — each branch mounts only when its tab is active */}
      <div className="min-h-[400px]">
        {activeTab === 'catalog' && <CatalogAnalyticsTab />}
        {activeTab === 'dora' && <DoraMetricsTab days={days} />}
        {activeTab === 'usage' && <UsageReportTab days={days} />}
      </div>
    </div>
  );
}
