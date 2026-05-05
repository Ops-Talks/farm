import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — hoisted by Vitest before any module is imported.
//
// All OTel Node SDK packages are mocked because they use Node.js internals
// that are unavailable or conflict with the jsdom test environment.
// ---------------------------------------------------------------------------

const mockSdkStart = vi.fn();
const mockSdkShutdown = vi.fn<() => Promise<void>>().mockResolvedValue(
  undefined,
);

const MockNodeSDK = vi.fn(function MockNodeSDK(
  this: { start: typeof mockSdkStart; shutdown: typeof mockSdkShutdown },
) {
  this.start = mockSdkStart;
  this.shutdown = mockSdkShutdown;
});

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: MockNodeSDK,
}));

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: vi.fn(() => []),
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn(),
}));

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: vi.fn(() => ({})),
}));

vi.mock('@opentelemetry/semantic-conventions', () => ({
  ATTR_SERVICE_NAME: 'service.name',
  ATTR_SERVICE_VERSION: 'service.version',
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('tracing.server', () => {
  beforeEach(() => {
    // Reset module registry so the module-level `sdk` variable is cleared
    // between tests, simulating a fresh server startup each time.
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.OTEL_ENABLED;
    delete process.env.OTEL_EXPORTER_ENDPOINT;
    delete process.env.OTEL_SERVICE_NAME;
  });

  it('does nothing when OTEL_ENABLED is not set', async () => {
    const { initTracing } = await import('./tracing.server');
    await initTracing();
    expect(MockNodeSDK).not.toHaveBeenCalled();
    expect(mockSdkStart).not.toHaveBeenCalled();
  });

  it('does nothing when OTEL_ENABLED is "false"', async () => {
    process.env.OTEL_ENABLED = 'false';
    const { initTracing } = await import('./tracing.server');
    await initTracing();
    expect(MockNodeSDK).not.toHaveBeenCalled();
  });

  it('starts the SDK when OTEL_ENABLED is "true"', async () => {
    process.env.OTEL_ENABLED = 'true';
    const { initTracing } = await import('./tracing.server');
    await initTracing();
    expect(MockNodeSDK).toHaveBeenCalledOnce();
    expect(mockSdkStart).toHaveBeenCalledOnce();
  });

  it('calling initTracing twice does not start the SDK a second time', async () => {
    process.env.OTEL_ENABLED = 'true';
    const { initTracing } = await import('./tracing.server');
    await initTracing();
    await initTracing();
    expect(MockNodeSDK).toHaveBeenCalledOnce();
    expect(mockSdkStart).toHaveBeenCalledOnce();
  });

  it('uses the default OTLP endpoint when OTEL_EXPORTER_ENDPOINT is not set', async () => {
    process.env.OTEL_ENABLED = 'true';
    const { OTLPTraceExporter } = await import(
      '@opentelemetry/exporter-trace-otlp-http'
    );
    const { initTracing } = await import('./tracing.server');
    await initTracing();
    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://localhost:4318/v1/traces' }),
    );
  });

  it('uses OTEL_EXPORTER_ENDPOINT when set', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_EXPORTER_ENDPOINT = 'http://tempo:4318/v1/traces';
    const { OTLPTraceExporter } = await import(
      '@opentelemetry/exporter-trace-otlp-http'
    );
    const { initTracing } = await import('./tracing.server');
    await initTracing();
    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'http://tempo:4318/v1/traces' }),
    );
  });

  it('uses "farm-web" as the default service name when OTEL_SERVICE_NAME is not set', async () => {
    process.env.OTEL_ENABLED = 'true';
    const { resourceFromAttributes } = await import('@opentelemetry/resources');
    const { initTracing } = await import('./tracing.server');
    await initTracing();
    expect(resourceFromAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ 'service.name': 'farm-web' }),
    );
  });

  it('honors OTEL_SERVICE_NAME when set', async () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_SERVICE_NAME = 'my-custom-service';
    const { resourceFromAttributes } = await import('@opentelemetry/resources');
    const { initTracing } = await import('./tracing.server');
    await initTracing();
    expect(resourceFromAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ 'service.name': 'my-custom-service' }),
    );
  });

  it('shutdownTracing resolves without error when no SDK is initialized', async () => {
    const { shutdownTracing } = await import('./tracing.server');
    await expect(shutdownTracing()).resolves.toBeUndefined();
  });

  it('shutdownTracing calls sdk.shutdown() when the SDK has been started', async () => {
    process.env.OTEL_ENABLED = 'true';
    const { initTracing, shutdownTracing } = await import('./tracing.server');
    await initTracing();
    await shutdownTracing();
    expect(mockSdkShutdown).toHaveBeenCalledOnce();
  });
});
