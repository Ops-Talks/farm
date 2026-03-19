import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// OTel API mock — must be declared before the module under test is imported.
// ---------------------------------------------------------------------------

const mockSpan = {
  setAttributes: vi.fn(),
  setAttribute: vi.fn(),
  setStatus: vi.fn(),
  recordException: vi.fn(),
  end: vi.fn(),
};

const mockTracer = {
  startSpan: vi.fn(() => mockSpan),
};

// context.with() must invoke the fn so the wrapped code actually executes.
const mockWith = vi.fn((_, fn: () => unknown) => fn());
const mockActive = vi.fn(() => ({}));
const mockSetSpan = vi.fn((ctx: unknown) => ctx);

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => mockTracer),
    setSpan: (...args: unknown[]) => mockSetSpan(...args),
    getActiveSpan: vi.fn(() => null),
  },
  context: {
    active: () => mockActive(),
    with: (...args: Parameters<typeof mockWith>) => mockWith(...args),
  },
  SpanStatusCode: {
    UNSET: 0,
    OK: 1,
    ERROR: 2,
  },
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

import { startSpan, recordSpan } from './otel-spans';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('startSpan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls getTracer with the farm-web tracer name', async () => {
    const { trace } = await import('@opentelemetry/api');
    startSpan('test.span');
    expect(trace.getTracer).toHaveBeenCalledWith('farm-web');
  });

  it('creates a span with the given name', () => {
    startSpan('auth.login');
    expect(mockTracer.startSpan).toHaveBeenCalledWith('auth.login');
  });

  it('sets attributes on the span when provided', () => {
    startSpan('auth.login', { 'auth.method': 'local', attempts: 1 });
    expect(mockSpan.setAttributes).toHaveBeenCalledWith({
      'auth.method': 'local',
      attempts: 1,
    });
  });

  it('does not call setAttributes when no attributes are provided', () => {
    startSpan('auth.login');
    expect(mockSpan.setAttributes).not.toHaveBeenCalled();
  });

  it('returns the created span', () => {
    const span = startSpan('test.span');
    expect(span).toBe(mockSpan);
  });
});

describe('recordSpan', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a span with the given name', async () => {
    await recordSpan('catalog.search', () => 'result');
    expect(mockTracer.startSpan).toHaveBeenCalledWith('catalog.search');
  });

  it('sets attributes before executing the function', async () => {
    await recordSpan('catalog.search', () => 'result', {
      'search.query': 'auth',
      'search.results_count': 3,
    });
    expect(mockSpan.setAttributes).toHaveBeenCalledWith({
      'search.query': 'auth',
      'search.results_count': 3,
    });
  });

  it('executes the wrapped function and returns its result', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await recordSpan('test.span', fn);
    expect(fn).toHaveBeenCalledOnce();
    expect(result).toBe(42);
  });

  it('executes synchronous functions correctly', async () => {
    const fn = vi.fn().mockReturnValue('sync-result');
    const result = await recordSpan('test.span', fn);
    expect(result).toBe('sync-result');
  });

  it('sets SpanStatusCode.OK on successful completion', async () => {
    const { SpanStatusCode } = await import('@opentelemetry/api');
    await recordSpan('test.span', () => 'ok');
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.OK,
    });
  });

  it('always ends the span even on success', async () => {
    await recordSpan('test.span', () => 'ok');
    expect(mockSpan.end).toHaveBeenCalledOnce();
  });

  it('sets SpanStatusCode.ERROR when the function throws', async () => {
    const { SpanStatusCode } = await import('@opentelemetry/api');
    const err = new Error('API failed');
    await expect(
      recordSpan('test.span', () => { throw err; }),
    ).rejects.toThrow('API failed');

    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
      message: 'API failed',
    });
  });

  it('calls recordException when the function throws an Error', async () => {
    const err = new Error('bad request');
    await expect(
      recordSpan('test.span', () => { throw err; }),
    ).rejects.toThrow();
    expect(mockSpan.recordException).toHaveBeenCalledWith(err);
  });

  it('ends the span even when the function throws', async () => {
    await expect(
      recordSpan('test.span', () => { throw new Error('fail'); }),
    ).rejects.toThrow();
    expect(mockSpan.end).toHaveBeenCalledOnce();
  });

  it('re-throws the original error', async () => {
    const err = new Error('original error');
    await expect(
      recordSpan('test.span', () => Promise.reject(err)),
    ).rejects.toBe(err);
  });

  it('uses context.with to propagate span context', async () => {
    await recordSpan('test.span', () => 'result');
    expect(mockWith).toHaveBeenCalledOnce();
  });

  it('does not call setAttributes when no attributes are provided', async () => {
    await recordSpan('test.span', () => 'result');
    expect(mockSpan.setAttributes).not.toHaveBeenCalled();
  });
});
