'use client';

/**
 * TracingInit — zero-render Client Component that bootstraps the OTel web SDK.
 *
 * Place this once in the root layout inside <body>.  It renders `null` so it
 * adds no DOM nodes.  The empty dependency array in useEffect guarantees
 * initTracing() and initWebVitals() are called exactly once per browser
 * session regardless of how many times the component re-renders (React Strict
 * Mode, fast refresh, etc.).
 */

import { useEffect } from 'react';
import { initTracing } from '@/lib/tracing';
import { initWebVitals } from '@/lib/web-vitals';

export function TracingInit() {
  useEffect(() => {
    // initTracing() is idempotent — safe even if React calls this twice in
    // Strict Mode during development.
    initTracing();

    // Register Core Web Vitals observers after the OTel SDK is ready so that
    // metrics are exported through the same BatchSpanProcessor pipeline.
    initWebVitals();
  }, []); // run once on mount

  // Renders nothing — this component exists solely for its side-effect.
  return null;
}
