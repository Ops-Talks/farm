/**
 * Server-side OpenTelemetry Node SDK initializer for farm-web.
 *
 * This module is loaded exclusively from `instrumentation.ts`, which Next.js
 * runs on the Node.js server runtime (never in the browser or Edge runtime).
 *
 * All OTel SDK packages are loaded via dynamic `import()` inside `initTracing`
 * to prevent Next.js / webpack from attempting to bundle Node.js-only modules
 * into the client or Edge bundles.
 */

import type { NodeSDK } from '@opentelemetry/sdk-node';

let sdk: NodeSDK | undefined;

/**
 * Starts the OpenTelemetry Node SDK.
 *
 * Does nothing unless `OTEL_ENABLED=true` is set in the environment.
 * Safe to call multiple times — subsequent calls after the first are no-ops
 * because the SDK is already started.
 */
export async function initTracing(): Promise<void> {
  if (process.env.OTEL_ENABLED !== 'true') return;
  if (sdk) return;

  // Dynamic imports prevent Next.js/webpack from statically bundling Node.js-only
  // OTel packages into the client or Edge bundles.
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = await import(
    '@opentelemetry/auto-instrumentations-node'
  );
  const { OTLPTraceExporter } = await import(
    '@opentelemetry/exporter-trace-otlp-http'
  );
  const { resourceFromAttributes } = await import('@opentelemetry/resources');
  const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = await import(
    '@opentelemetry/semantic-conventions'
  );

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'farm-web',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? 'unknown',
    }),
    traceExporter: new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_ENDPOINT ?? 'http://localhost:4318/v1/traces',
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
}

/**
 * Gracefully shuts down the OpenTelemetry SDK, flushing any pending spans.
 *
 * Safe to call even if `initTracing()` was never called or OTEL was disabled.
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) await sdk.shutdown();
}
