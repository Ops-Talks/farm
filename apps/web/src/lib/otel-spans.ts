/**
 * Typed OpenTelemetry span helpers for client-side instrumentation.
 *
 * Two primitives:
 *   - `startSpan`  — creates a span and returns it so callers can set
 *                    attributes based on operation outcome before calling
 *                    `span.end()` manually.  Use for flows with branching
 *                    success/error paths (e.g. form submissions).
 *
 *   - `recordSpan` — wraps a synchronous or asynchronous function in a
 *                    span that is automatically ended when the fn settles.
 *                    Sets SpanStatusCode.OK on success and
 *                    SpanStatusCode.ERROR (with `recordException`) on throw.
 *
 * Both helpers use the `farm-web` tracer, consistent with `tracing.ts`.
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';

const TRACER_NAME = 'farm-web';

/**
 * Creates and returns a new span.  The caller is responsible for calling
 * `span.end()` when the operation completes.
 *
 * @param name       - OTel span name (e.g. `auth.login`)
 * @param attributes - Initial span attributes set before the operation starts
 */
export function startSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>,
): Span {
  const span = trace.getTracer(TRACER_NAME).startSpan(name);

  if (attributes) {
    span.setAttributes(attributes);
  }

  return span;
}

/**
 * Runs `fn` inside a span that is automatically ended after the function
 * resolves (or rejects).
 *
 * - On success: sets SpanStatusCode.OK and returns the resolved value.
 * - On failure: sets SpanStatusCode.ERROR, records the exception, and
 *   re-throws so the caller can handle it normally.
 *
 * The fn runs within the span's OTel context so that any child spans
 * created inside `fn` will be correctly attributed as children of this span.
 *
 * @param name       - OTel span name
 * @param fn         - Synchronous or asynchronous operation to instrument
 * @param attributes - Span attributes to set before `fn` is called
 */
export async function recordSpan<T>(
  name: string,
  fn: () => T | Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  const span = tracer.startSpan(name);

  if (attributes) {
    span.setAttributes(attributes);
  }

  // Run fn inside the span's context so child spans are properly linked.
  const spanContext = trace.setSpan(context.active(), span);

  try {
    const result = await context.with(spanContext, fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof Error) {
      span.recordException(err);
    }
    throw err;
  } finally {
    span.end();
  }
}
