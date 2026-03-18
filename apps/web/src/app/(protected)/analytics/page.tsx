// Server Component shell — keeps page.tsx lean and delegates all client-side
// work (state, queries, tab switching) to AnalyticsPageClient.
import type { Metadata } from 'next';
import { AnalyticsPageClient } from './_components/AnalyticsPageClient';

export const metadata: Metadata = { title: 'Analytics — Farm' };

export default function AnalyticsPage() {
  return <AnalyticsPageClient />;
}
