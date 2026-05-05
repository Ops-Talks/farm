'use client';

import { useEffect } from 'react';

/**
 * Next.js global error boundary component.
 *
 * This component catches unhandled errors that escape all nested error
 * boundaries and replaces the entire root layout. Because it is a client
 * component, it cannot import server-only modules such as logger.server.ts.
 *
 * The error is forwarded to /api/log-error so the server-side Winston logger
 * can write a structured JSON entry that Promtail picks up and ships to Loki.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Fallback: log to the browser console so there is at least some
      // visibility when the logging endpoint is unreachable.
      console.error('[GlobalError] Failed to forward error to /api/log-error', error);
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong</h2>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  );
}
