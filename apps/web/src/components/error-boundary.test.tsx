import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '@/components/error-boundary';

// ---------------------------------------------------------------------------
// Helper: a component that always throws during render.
// ---------------------------------------------------------------------------

function ThrowError(): null {
  throw new Error('test error');
}

// ---------------------------------------------------------------------------
// Helper: a component that renders normally.
// ---------------------------------------------------------------------------

function HappyChild() {
  return <p>all good</p>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ErrorBoundary', () => {
  // Silence the noisy "An update to ErrorBoundary inside a test was not
  // wrapped in act(...)" console.error calls that React emits when an
  // error boundary catches during tests.
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // ── Scenario 1: child throws → default fallback UI is rendered ────────────
  it('catches errors thrown by children and renders the default fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    // Default fallback shows a "Something went wrong" heading.
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // It also surfaces the error message.
    expect(screen.getByText('test error')).toBeInTheDocument();
    // The "Try again" reload button should be present.
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  // ── Scenario 2: no error → children render normally ───────────────────────
  it('renders children normally when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <HappyChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('all good')).toBeInTheDocument();
    // The fallback heading must not appear.
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  // ── Scenario 3: custom `fallback` prop ────────────────────────────────────
  it('renders the custom fallback prop instead of the default when provided', () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback content</div>}>
        <ThrowError />
      </ErrorBoundary>,
    );

    // The custom fallback node should appear …
    expect(screen.getByText('custom fallback content')).toBeInTheDocument();
    // … and the default "Something went wrong" card must NOT appear.
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  // ── Scenario 4: componentDidCatch logs to console.error ───────────────────
  it('logs the error via console.error when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    // console.error should have been called at least once (React calls it too,
    // but our componentDidCatch call passes the Error as the first argument).
    const errorCalls = consoleErrorSpy.mock.calls;
    const loggedOurError = errorCalls.some(
      (args: unknown[]) => args[0] instanceof Error && (args[0] as Error).message === 'test error',
    );
    expect(loggedOurError).toBe(true);
  });
});
