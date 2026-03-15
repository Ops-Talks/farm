// Server Component — no "use client" needed here.
// All interactive logic (useState, useEffect, setInterval, tab switching,
// auto-refresh) lives in ObservabilityClient which is a Client Component.
// The HealthTab, MetricsTab, and TracesTab sub-components remain co-located
// in _components/ and are imported directly by ObservabilityClient.
import { ObservabilityClient } from "./_components/ObservabilityClient";

export default function ObservabilityPage() {
  return <ObservabilityClient />;
}
