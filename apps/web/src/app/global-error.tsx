'use client';

import { useEffect } from 'react';

/**
 * Next.js global error boundary component.
 *
 * This component catches unhandled errors that escape all nested error
 * boundaries and replaces the entire root layout. Because it is a client
 * component, it cannot import server-only modules such as logger.server.ts.
 *
 * Structured JSON is written to console.error so Promtail/Loki can parse
 * the `level`, `message`, and `context` labels from the log line.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: 'error',
        message: error.message,
        context: 'GlobalError',
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }),
    );
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
