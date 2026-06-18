import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoist mock declarations so Vitest can lift them before the imports below.
// ---------------------------------------------------------------------------

// Capture the callback that initWebVitals() passes to each observer so tests
// can invoke it directly to simulate a metric being reported.
const mockOnCLS = vi.fn();
const mockOnLCP = vi.fn();
const mockOnTTFB = vi.fn();
const mockOnINP = vi.fn();

vi.mock('web-vitals', () => ({
  onCLS: (...args: unknown[]) => mockOnCLS(...args),
  onLCP: (...args: unknown[]) => mockOnLCP(...args),
  onTTFB: (...args: unknown[]) => mockOnTTFB(...args),
  onINP: (...args: unknown[]) => mockOnINP(...args),
}));

// Shared mock span so each test can assert on the calls made to it.
const mockSpan = {
  setAttributes: vi.fn(),
  end: vi.fn(),
};

const mockTracer = {
  startSpan: vi.fn(() => mockSpan),
};

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => mockTracer),
    getActiveSpan: vi.fn(() => null),
  },
}));

// ---------------------------------------------------------------------------
// Module under test — imported AFTER mocks are registered.
// ---------------------------------------------------------------------------

import { initWebVitals } from './web-vitals';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal Metric object that matches the web-vitals Metric shape. */
function fakeMetric(
  name: string,
  value: number,
  rating: 'good' | 'needs-improvement' | 'poor' = 'good',
) {
  return { name, value, rating, id: 'v3-xxx', delta: value, entries: [], navigationType: 'navigate' };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('initWebVitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure window is defined (browser environment).
    Object.defineProperty(global, 'window', { value: {}, writable: true });
  });

  it('registers all four Web Vitals observers on mount', () => {
    initWebVitals();

    expect(mockOnCLS).toHaveBeenCalledOnce();
    expect(mockOnLCP).toHaveBeenCalledOnce();
    expect(mockOnTTFB).toHaveBeenCalledOnce();
    expect(mockOnINP).toHaveBeenCalledOnce();
  });

  it('does nothing on the server (window undefined)', () => {
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
    });

    initWebVitals();

    expect(mockOnCLS).not.toHaveBeenCalled();
    expect(mockOnLCP).not.toHaveBeenCalled();
    expect(mockOnTTFB).not.toHaveBeenCalled();
    expect(mockOnINP).not.toHaveBeenCalled();
  });

  it('creates a span with correct attributes when a CLS metric fires', () => {
    initWebVitals();

    // Grab the callback that was registered with onCLS and invoke it.
    const clsCallback = mockOnCLS.mock.calls[0]?.[0] as (m: unknown) => void;
    clsCallback(fakeMetric('CLS', 0.05, 'good'));

    expect(mockTracer.startSpan).toHaveBeenCalledWith('web_vitals.cls');
    expect(mockSpan.setAttributes).toHaveBeenCalledWith({
      'web_vital.name': 'CLS',
      'web_vital.value': 0.05,
      'web_vital.rating': 'good',
    });
    expect(mockSpan.end).toHaveBeenCalledOnce();
  });

  it('creates a span with correct attributes when an LCP metric fires', () => {
    initWebVitals();

    const lcpCallback = mockOnLCP.mock.calls[0]?.[0] as (m: unknown) => void;
    lcpCallback(fakeMetric('LCP', 2450, 'good'));

    expect(mockTracer.startSpan).toHaveBeenCalledWith('web_vitals.lcp');
    expect(mockSpan.setAttributes).toHaveBeenCalledWith({
      'web_vital.name': 'LCP',
      'web_vital.value': 2450,
      'web_vital.rating': 'good',
    });
    expect(mockSpan.end).toHaveBeenCalledOnce();
  });

  it('creates a span with correct attributes when an INP metric fires', () => {
    initWebVitals();

    const inpCallback = mockOnINP.mock.calls[0]?.[0] as (m: unknown) => void;
    inpCallback(fakeMetric('INP', 180, 'needs-improvement'));

    expect(mockTracer.startSpan).toHaveBeenCalledWith('web_vitals.inp');
    expect(mockSpan.setAttributes).toHaveBeenCalledWith({
      'web_vital.name': 'INP',
      'web_vital.value': 180,
      'web_vital.rating': 'needs-improvement',
    });
    expect(mockSpan.end).toHaveBeenCalledOnce();
  });

  it('creates a span with correct attributes when a TTFB metric fires', () => {
    initWebVitals();

    const ttfbCallback = mockOnTTFB.mock.calls[0]?.[0] as (m: unknown) => void;
    ttfbCallback(fakeMetric('TTFB', 300, 'good'));

    expect(mockTracer.startSpan).toHaveBeenCalledWith('web_vitals.ttfb');
    expect(mockSpan.setAttributes).toHaveBeenCalledWith({
      'web_vital.name': 'TTFB',
      'web_vital.value': 300,
      'web_vital.rating': 'good',
    });
    expect(mockSpan.end).toHaveBeenCalledOnce();
  });

  it('records the "poor" rating correctly', () => {
    initWebVitals();

    const clsCallback = mockOnCLS.mock.calls[0]?.[0] as (m: unknown) => void;
    clsCallback(fakeMetric('CLS', 0.35, 'poor'));

    expect(mockSpan.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ 'web_vital.rating': 'poor' }),
    );
  });
});
