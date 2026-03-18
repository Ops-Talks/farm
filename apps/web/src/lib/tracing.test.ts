import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock all OTel packages BEFORE importing the module under test.
// Vitest hoists vi.mock() calls to the top of the file automatically.
// ---------------------------------------------------------------------------

vi.mock('@opentelemetry/sdk-trace-web', () => ({
  // Use a regular (non-arrow) function so `new WebTracerProvider()` works
  // even after vi.clearAllMocks() resets the mockImplementation.
  WebTracerProvider: vi.fn(function MockWebTracerProvider() {
    return { register: vi.fn(), addSpanProcessor: vi.fn() };
  }),
  BatchSpanProcessor: vi.fn(),
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn(),
}));

vi.mock('@opentelemetry/context-zone', () => ({
  ZoneContextManager: vi.fn(),
}));

vi.mock('@opentelemetry/instrumentation', () => ({
  registerInstrumentations: vi.fn(),
}));

vi.mock('@opentelemetry/auto-instrumentations-web', () => ({
  getWebAutoInstrumentations: vi.fn().mockReturnValue([]),
}));

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: vi.fn().mockReturnValue({}),
}));

vi.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
  ATTR_SERVICE_VERSION: 'service.version',
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('tracing', () => {
  beforeEach(() => {
    // Reset the module registry so the `initialized` flag is cleared between
    // tests — vi.resetModules() forces a fresh import each time.
    vi.resetModules();

    // Simulate a browser environment (window is defined).
    Object.defineProperty(global, 'window', { value: {}, writable: true });
  });

  afterEach(() => {
    // Use resetAllMocks (not clearAllMocks) so call counts AND implementations
    // are reset uniformly.  The mock factories above use regular functions so
    // they survive as constructors even after a reset.
    vi.resetAllMocks();
  });

  it('should initialize tracing only once', async () => {
    const { initTracing } = await import('@/lib/tracing');
    const { WebTracerProvider } = await import('@opentelemetry/sdk-trace-web');

    initTracing();
    initTracing(); // second call must be a no-op (initialized flag is set)

    expect(WebTracerProvider).toHaveBeenCalledTimes(1);
  });

  it('should not initialize tracing on server (no window)', async () => {
    // Remove the window object to simulate a server (Node.js) environment.
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
    });

    const { initTracing } = await import('@/lib/tracing');
    const { WebTracerProvider } = await import('@opentelemetry/sdk-trace-web');

    initTracing();

    expect(WebTracerProvider).not.toHaveBeenCalled();
  });

  it('should use NEXT_PUBLIC_OTEL_ENDPOINT when set', async () => {
    process.env.NEXT_PUBLIC_OTEL_ENDPOINT = 'http://custom-collector/v1/traces';

    const { initTracing } = await import('@/lib/tracing');
    const { OTLPTraceExporter } = await import(
      '@opentelemetry/exporter-trace-otlp-http'
    );

    initTracing();

    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://custom-collector/v1/traces' }),
    );

    delete process.env.NEXT_PUBLIC_OTEL_ENDPOINT;
  });

  it('should fall back to default endpoint when env var not set', async () => {
    delete process.env.NEXT_PUBLIC_OTEL_ENDPOINT;

    const { initTracing } = await import('@/lib/tracing');
    const { OTLPTraceExporter } = await import(
      '@opentelemetry/exporter-trace-otlp-http'
    );

    initTracing();

    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/api/v1/traces/ingest' }),
    );
  });
});
