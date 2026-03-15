import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const OTEL_ENABLED = process.env.OTEL_ENABLED === "true";
const OTEL_EXPORTER_ENDPOINT =
  process.env.OTEL_EXPORTER_ENDPOINT || "http://localhost:4318/v1/traces";
const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "farm-api";

let sdk: NodeSDK | undefined;

/**
 * Initializes the OpenTelemetry SDK with auto-instrumentations and OTLP exporter.
 * Call this before NestFactory.create() so instrumentations patch modules early.
 * Only activates when OTEL_ENABLED=true to avoid overhead in development/test.
 */
export function initTracing(): void {
  if (!OTEL_ENABLED) {
    return;
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: OTEL_SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "unknown",
    }),
    traceExporter: new OTLPTraceExporter({
      url: OTEL_EXPORTER_ENDPOINT,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();
}

/**
 * Gracefully shuts down the OpenTelemetry SDK, flushing pending spans.
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
  }
}
