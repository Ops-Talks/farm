import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger.server';

const logger = createLogger('GlobalError');

/**
 * POST /api/log-error
 *
 * Accepts client-side error reports from the global error boundary and writes
 * a structured log entry via the server-side Winston logger so that Promtail
 * can forward it to Loki.
 *
 * No authentication is required: this endpoint is intentionally public because
 * the global error boundary may fire before a user session is established
 * (e.g., a crash on the login page).
 */
export async function POST(req: NextRequest): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(null, { status: 400 });
  }

  const message =
    typeof body.message === 'string' && body.message.length > 0
      ? body.message
      : 'Client-side render error';

  logger.error(message, {
    digest: typeof body.digest === 'string' ? body.digest : undefined,
    stack: typeof body.stack === 'string' ? body.stack : undefined,
    timestamp:
      typeof body.timestamp === 'string'
        ? body.timestamp
        : new Date().toISOString(),
  });

  return new Response(null, { status: 204 });
}
