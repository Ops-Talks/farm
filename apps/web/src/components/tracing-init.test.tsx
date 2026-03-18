import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TracingInit } from '@/components/tracing-init';

// Mock the tracing module so initTracing() is a controllable spy.
vi.mock('@/lib/tracing', () => ({ initTracing: vi.fn() }));

describe('TracingInit', () => {
  it('renders nothing', () => {
    const { container } = render(<TracingInit />);
    // The component returns null — the container should be empty.
    expect(container.firstChild).toBeNull();
  });

  it('calls initTracing on mount', async () => {
    const { initTracing } = await import('@/lib/tracing');

    render(<TracingInit />);

    // React 19 may invoke effects more than once in the test environment
    // (Strict Mode double-invocation).  Assert it was called at least once —
    // the `initialized` guard in the real initTracing() makes it idempotent.
    expect(initTracing).toHaveBeenCalled();
  });
});
