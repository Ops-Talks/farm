/**
 * Client-side OpenTelemetry SDK initializer.
 *
 * This is a plain TypeScript module (not a React component or Server Component).
 * It is called exactly once on first browser render via <TracingInit />.
 *
 * Span flow:
 *   Browser → OTLPTraceExporter → NEXT_PUBLIC_OTEL_ENDPOINT (default: /api/v1/traces/ingest)
 *   → NestJS proxy → Tempo collector
 *
 * The fetch instrumentation automatically injects `traceparent` headers into
 * all outgoing fetch/XHR requests, linking browser spans to backend spans in Tempo.
 */

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

/** Guards against double-initialisation (e.g. React Strict Mode double-invoke). */
let initialized = false;

/**
 * Bootstraps the OpenTelemetry web SDK.
 *
 * Safe to call multiple times — only the first call has any effect.
 * Must not be called on the server (guarded by `typeof window === 'undefined'`).
 */
export function initTracing(): void {
  // Short-circuit: already set up, or running on the server (SSR/SSG).
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // The OTLP collector endpoint.  In development this defaults to the NestJS
  // proxy at /api/v1/traces/ingest which forwards to the local Tempo instance.
  // Override with NEXT_PUBLIC_OTEL_ENDPOINT to point at a different collector.
  const endpoint =
    process.env.NEXT_PUBLIC_OTEL_ENDPOINT ?? '/api/v1/traces/ingest';

  const exporter = new OTLPTraceExporter({ url: endpoint });

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      // Semantic convention: the logical name of the service.
      [ATTR_SERVICE_NAME]: 'farm-web',
      // Semantic convention: the version of the deployed service.
      [ATTR_SERVICE_VERSION]: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
    }),
    // BatchSpanProcessor buffers spans and exports them in batches for efficiency.
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  // ZoneContextManager propagates OTel context across async browser operations
  // (setTimeout, Promise callbacks, event listeners) using Zone.js.
  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        // Fetch instrumentation: auto-injects `traceparent` header into all
        // outgoing fetch() calls, connecting browser spans to server spans.
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: [/.*/],
          clearTimingResources: true,
        },
        // XHR instrumentation: same traceparent propagation for XHR requests.
        '@opentelemetry/instrumentation-xml-http-request': {
          propagateTraceHeaderCorsUrls: [/.*/],
        },
        // Document-load instrumentation: creates a root span for the initial
        // page load, capturing navigation timing metrics.
        '@opentelemetry/instrumentation-document-load': {},
      }),
    ],
  });
}
