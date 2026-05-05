import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Writable } from 'stream';

// ---------------------------------------------------------------------------
// Mocks — hoisted by Vitest before any module is imported.
// ---------------------------------------------------------------------------

// Side-effect import of winston-daily-rotate-file has no observable behavior
// in tests, so suppress it with an empty module.
vi.mock('winston-daily-rotate-file', () => ({}));

const mockGetActiveSpan = vi.fn<() => null | {
  spanContext: () => { traceId: string; spanId: string };
}>(() => null);

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: () => mockGetActiveSpan(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCaptureStream(): { stream: Writable; getOutput: () => string } {
  let captured = '';
  const stream = new Writable({
    write(chunk: Buffer | string, _enc: BufferEncoding, done: () => void) {
      captured += typeof chunk === 'string' ? chunk : chunk.toString();
      done();
    },
  });
  return { stream, getOutput: () => captured };
}

// ---------------------------------------------------------------------------
// Tests — development environment (default NODE_ENV in Vitest)
// ---------------------------------------------------------------------------

describe('logger.server (development)', () => {
  let logger: Awaited<typeof import('./logger.server')>['logger'];
  let createLogger: Awaited<typeof import('./logger.server')>['createLogger'];

  beforeEach(async () => {
    vi.resetModules();
    mockGetActiveSpan.mockReturnValue(null);
    ({ logger, createLogger } = await import('./logger.server'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exports a logger with standard winston logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('createLogger returns an object with standard logging methods', () => {
    const child = createLogger('MyService');
    expect(typeof child.info).toBe('function');
    expect(typeof child.error).toBe('function');
    expect(typeof child.warn).toBe('function');
  });

  it('createLogger returns a distinct logger instance from the parent', () => {
    const child = createLogger('MyContext');
    expect(child).not.toBe(logger);
  });

  it('calling logger.info does not throw', () => {
    expect(() => logger.info('test message')).not.toThrow();
  });

  it('calling logger.error does not throw', () => {
    expect(() => logger.error('test error')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tests — production environment (JSON format + trace injection)
//
// The logger uses a logger-level format (jsonFormat in production), so any
// transport added to it also receives the fully-formatted JSON output.
// We add an in-memory Stream transport to capture that output for assertions.
// ---------------------------------------------------------------------------

describe('logger.server (production)', () => {
  let logger: Awaited<typeof import('./logger.server')>['logger'];
  let createLogger: Awaited<typeof import('./logger.server')>['createLogger'];
  let capture: ReturnType<typeof buildCaptureStream>;
  let originalNodeEnv: string | undefined;

  beforeEach(async () => {
    vi.resetModules();
    mockGetActiveSpan.mockReturnValue(null);
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    ({ logger, createLogger } = await import('./logger.server'));

    // Add an in-memory stream transport. Because the logger-level format
    // (jsonFormat) is already applied before transport writes, this stream
    // receives the final serialised JSON string for each log entry.
    const { transports } = await import('winston');
    capture = buildCaptureStream();
    logger.add(new transports.Stream({ stream: capture.stream }));
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    vi.clearAllMocks();
  });

  function getLastLogEntry(): Record<string, unknown> {
    const lines = capture.getOutput().trim().split('\n').filter(Boolean);
    return JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
  }

  it('JSON output contains level, message, and timestamp fields', async () => {
    logger.info('hello world');
    await new Promise((r) => setImmediate(r));
    const entry = getLastLogEntry();
    expect(entry).toMatchObject({ level: 'info', message: 'hello world' });
    expect(typeof entry['timestamp']).toBe('string');
  });

  it('JSON output includes the default context field', async () => {
    logger.info('ctx check');
    await new Promise((r) => setImmediate(r));
    const entry = getLastLogEntry();
    expect(entry['context']).toBe('farm-web');
  });

  it('level is a plain string in JSON output', async () => {
    logger.error('an error occurred');
    await new Promise((r) => setImmediate(r));
    const entry = getLastLogEntry();
    expect(entry['level']).toBe('error');
  });

  it('child logger emits its overridden context in JSON output', async () => {
    const child = createLogger('SpecificContext');
    child.info('child log');
    await new Promise((r) => setImmediate(r));
    const entry = getLastLogEntry();
    expect(entry['context']).toBe('SpecificContext');
  });

  it('injects trace_id and span_id when an active span is present', async () => {
    mockGetActiveSpan.mockReturnValue({
      spanContext: () => ({
        traceId: 'abc123def456abc123def456abc12345',
        spanId: 'span7890abcd',
      }),
    });

    logger.info('traced log');
    await new Promise((r) => setImmediate(r));
    const entry = getLastLogEntry();
    expect(entry['trace_id']).toBe('abc123def456abc123def456abc12345');
    expect(entry['span_id']).toBe('span7890abcd');
  });

  it('omits trace_id and span_id when no active span exists', async () => {
    mockGetActiveSpan.mockReturnValue(null);
    logger.info('untraced log');
    await new Promise((r) => setImmediate(r));
    const entry = getLastLogEntry();
    expect(entry['trace_id']).toBeUndefined();
    expect(entry['span_id']).toBeUndefined();
  });
});

