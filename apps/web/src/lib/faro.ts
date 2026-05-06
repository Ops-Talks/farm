import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

let faro: ReturnType<typeof initializeFaro> | null = null;

export function initFaro(): void {
  if (typeof window === 'undefined' || faro) return;

  const collectorUrl = process.env.NEXT_PUBLIC_FARO_URL;
  if (!collectorUrl) return;

  faro = initializeFaro({
    url: collectorUrl,
    app: {
      name: 'farm-web',
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
      environment: process.env.NODE_ENV,
    },
    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: false,
      }),
      new TracingInstrumentation(),
    ],
  });
}
