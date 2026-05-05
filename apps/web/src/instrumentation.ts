/**
 * Next.js native instrumentation hook (instrumentation.ts).
 *
 * Next.js calls `register()` once on the Node.js server runtime at startup.
 * It is NEVER called in the browser — browser tracing is bootstrapped via
 * <TracingInit /> in the root layout instead.
 *
 * `onRequestError` is called by Next.js for every unhandled server-side
 * request error, providing a central hook for structured error logging.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initTracing } = await import('./lib/tracing.server');
    await initTracing();
    const { logger } = await import('./lib/logger.server');
    logger.info('farm-web server started', { context: 'Bootstrap' });
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
): Promise<void> {
  const { logger } = await import('./lib/logger.server');
  logger.error('Unhandled request error', {
    context: 'RequestError',
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
}
