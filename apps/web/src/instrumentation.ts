/**
 * Next.js native instrumentation hook (instrumentation.ts).
 *
 * Next.js calls `register()` once on the Node.js server runtime at startup
 * and once on the Edge runtime. It is NEVER called in the browser — browser
 * tracing is bootstrapped via <TracingInit /> in the root layout instead.
 *
 * Server-side OTel is already handled by the NestJS backend (apps/api),
 * so this file is intentionally a no-op on the server.
 */
export async function register(): Promise<void> {
  // Guard: this file must never run in the browser.
  if (typeof window !== 'undefined') return;

  // Server-side: the backend NestJS app handles server tracing via its own
  // OpenTelemetry Node SDK. No additional setup is required here.
}
