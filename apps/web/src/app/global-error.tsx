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
 * Three attempts are made with exponential backoff; if all fail, sendBeacon
 * is used as a best-effort fallback. The error is always echoed to
 * console.error so it is visible in browser devtools regardless.
 */

const LOG_URL = '/api/log-error';

async function retryLogError(payload: string): Promise<void> {
  const delays = [0, 300, 1200];
  for (const delay of delays) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const res = await fetch(LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      });
      if (res.ok) return;
    } catch {
      // Retry on network error
    }
  }
  // All fetch attempts failed — use sendBeacon as last-resort delivery
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(LOG_URL, payload);
  }
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const payload = JSON.stringify({
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Always log to console so the error is visible in devtools.
    console.error('[GlobalError] Unhandled error captured', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });

    void retryLogError(payload);
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
