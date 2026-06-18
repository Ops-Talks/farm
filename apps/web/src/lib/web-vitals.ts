/**
 * Web Vitals OTel reporter.
 *
 * Registers the five Core Web Vitals callbacks from the `web-vitals` library
 * and reports each metric as an individual OpenTelemetry span.  Each span
 * carries three attributes:
 *   - web_vital.name   — metric name (CLS, FID, LCP, TTFB, INP)
 *   - web_vital.value  — numeric measurement
 *   - web_vital.rating — 'good' | 'needs-improvement' | 'poor'
 *
 * Call `initWebVitals()` once after `initTracing()` has been called.
 * Safe to call on the server — the function returns early if `window` is
 * not defined.
 */

import { trace } from '@opentelemetry/api';
import { onCLS, onLCP, onTTFB, onINP } from 'web-vitals';
import type { Metric } from 'web-vitals';

const TRACER_NAME = 'farm-web';

/**
 * Creates a short-lived OTel span for a single Web Vitals metric.
 * The span name follows the pattern `web_vitals.<metric_name_lowercase>`.
 */
function reportMetric(metric: Metric): void {
  const tracer = trace.getTracer(TRACER_NAME);
  const span = tracer.startSpan(`web_vitals.${metric.name.toLowerCase()}`);

  span.setAttributes({
    'web_vital.name': metric.name,
    'web_vital.value': metric.value,
    'web_vital.rating': metric.rating,
  });

  span.end();
}

/**
 * Registers all four Core Web Vitals observers and wires them up to OTel.
 *
 * Safe to call multiple times — the `web-vitals` library itself de-dupes
 * observers, so only the first registration per metric takes effect.
 *
 * Must not run on the server (guarded by `typeof window === 'undefined'`).
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') return;

  onCLS(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
  onINP(reportMetric);
}
