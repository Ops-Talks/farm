import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — hoisted by Vitest before any module is imported.
//
// `register()` and `onRequestError()` use dynamic import() to load
// tracing.server and logger.server. Vitest's vi.mock() intercepts those
// dynamic imports just like static ones, so the mock implementations below
// are used whenever instrumentation.ts calls `await import(...)`.
// ---------------------------------------------------------------------------

const mockInitTracing = vi.fn<() => Promise<void>>().mockResolvedValue(
  undefined,
);
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('./lib/tracing.server', () => ({
  initTracing: mockInitTracing,
}));

vi.mock('./lib/logger.server', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('instrumentation', () => {
  let originalNextRuntime: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalNextRuntime = process.env.NEXT_RUNTIME;
    delete process.env.NEXT_RUNTIME;
  });

  afterEach(() => {
    if (originalNextRuntime !== undefined) {
      process.env.NEXT_RUNTIME = originalNextRuntime;
    } else {
      delete process.env.NEXT_RUNTIME;
    }
  });

  // -------------------------------------------------------------------------
  // register()
  // -------------------------------------------------------------------------

  describe('register()', () => {
    it('calls initTracing and logs startup when NEXT_RUNTIME is "nodejs"', async () => {
      process.env.NEXT_RUNTIME = 'nodejs';
      const { register } = await import('./instrumentation');
      await register();
      expect(mockInitTracing).toHaveBeenCalledOnce();
      expect(mockLoggerInfo).toHaveBeenCalledWith('farm-web server started', {
        context: 'Bootstrap',
      });
    });

    it('does nothing when NEXT_RUNTIME is not set', async () => {
      const { register } = await import('./instrumentation');
      await register();
      expect(mockInitTracing).not.toHaveBeenCalled();
      expect(mockLoggerInfo).not.toHaveBeenCalled();
    });

    it('does nothing when NEXT_RUNTIME is "edge"', async () => {
      process.env.NEXT_RUNTIME = 'edge';
      const { register } = await import('./instrumentation');
      await register();
      expect(mockInitTracing).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // onRequestError()
  // -------------------------------------------------------------------------

  describe('onRequestError()', () => {
    it('logs an Error instance with message, path, method, and stack', async () => {
      const { onRequestError } = await import('./instrumentation');
      const err = new Error('route crashed');
      await onRequestError(
        err,
        { path: '/api/catalog', method: 'GET' },
        { routerKind: 'App', routePath: '/api/catalog', routeType: 'route' },
      );
      expect(mockLoggerError).toHaveBeenCalledWith('Unhandled request error', {
        context: 'RequestError',
        path: '/api/catalog',
        method: 'GET',
        routePath: '/api/catalog',
        routeType: 'route',
        error: 'route crashed',
        stack: err.stack,
      });
    });

    it('handles non-Error thrown values', async () => {
      const { onRequestError } = await import('./instrumentation');
      await onRequestError(
        'plain string thrown',
        { path: '/api/test', method: 'POST' },
        { routerKind: 'App', routePath: '/api/test', routeType: 'route' },
      );
      expect(mockLoggerError).toHaveBeenCalledWith('Unhandled request error', {
        context: 'RequestError',
        path: '/api/test',
        method: 'POST',
        routePath: '/api/test',
        routeType: 'route',
        error: 'plain string thrown',
        stack: undefined,
      });
    });
  });
});
