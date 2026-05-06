import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@grafana/faro-web-sdk', () => ({
  initializeFaro: vi.fn().mockReturnValue({ api: {}, config: {} }),
  getWebInstrumentations: vi.fn().mockReturnValue([]),
}));

vi.mock('@grafana/faro-web-tracing', () => ({
  TracingInstrumentation: vi.fn(function MockTracingInstrumentation() {
    return {};
  }),
}));

import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

describe('initFaro', () => {
  let initFaro: () => void;
  let originalFaroUrl: string | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the module so the singleton `faro` variable is re-initialised.
    vi.resetModules();
    const mod = await import('./faro');
    initFaro = mod.initFaro;
    originalFaroUrl = process.env.NEXT_PUBLIC_FARO_URL;
  });

  afterEach(() => {
    if (originalFaroUrl === undefined) {
      delete process.env.NEXT_PUBLIC_FARO_URL;
    } else {
      process.env.NEXT_PUBLIC_FARO_URL = originalFaroUrl;
    }
    delete process.env.NEXT_PUBLIC_APP_VERSION;
  });

  it('does nothing when window is undefined (SSR)', () => {
    const savedWindow = globalThis.window;
    // @ts-expect-error intentionally removing window to simulate SSR
    delete globalThis.window;
    process.env.NEXT_PUBLIC_FARO_URL = 'http://localhost:12347/collect';

    try {
      initFaro();
      expect(initializeFaro).not.toHaveBeenCalled();
    } finally {
      // @ts-expect-error restoring window
      globalThis.window = savedWindow;
    }
  });

  it('does nothing when NEXT_PUBLIC_FARO_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_FARO_URL;

    initFaro();

    expect(initializeFaro).not.toHaveBeenCalled();
  });

  it('calls initializeFaro with correct config when URL is set', () => {
    process.env.NEXT_PUBLIC_FARO_URL = 'http://localhost:12347/collect';

    initFaro();

    expect(initializeFaro).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:12347/collect',
        app: expect.objectContaining({
          name: 'farm-web',
        }),
      }),
    );
    expect(getWebInstrumentations).toHaveBeenCalledWith({ captureConsole: false });
    expect(TracingInstrumentation).toHaveBeenCalled();
  });

  it('uses NEXT_PUBLIC_APP_VERSION when set', async () => {
    vi.resetModules();
    const freshMod = await import('./faro');
    process.env.NEXT_PUBLIC_FARO_URL = 'http://localhost:12347/collect';
    process.env.NEXT_PUBLIC_APP_VERSION = '1.2.3';

    freshMod.initFaro();

    expect(initializeFaro).toHaveBeenCalledWith(
      expect.objectContaining({
        app: expect.objectContaining({
          version: '1.2.3',
        }),
      }),
    );
  });

  it('falls back to "unknown" version when NEXT_PUBLIC_APP_VERSION is unset', async () => {
    vi.resetModules();
    const freshMod = await import('./faro');
    process.env.NEXT_PUBLIC_FARO_URL = 'http://localhost:12347/collect';
    delete process.env.NEXT_PUBLIC_APP_VERSION;

    freshMod.initFaro();

    expect(initializeFaro).toHaveBeenCalledWith(
      expect.objectContaining({
        app: expect.objectContaining({
          version: 'unknown',
        }),
      }),
    );
  });
});

