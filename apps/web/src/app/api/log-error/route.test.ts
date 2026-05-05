import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — hoisted by Vitest before any module is imported.
//
// `route.ts` calls `createLogger('GlobalError')` at module level, so
// `mockLoggerError` must be initialized before the mock factory executes.
// vi.hoisted() guarantees that by running before all import statements.
// ---------------------------------------------------------------------------

const { mockLoggerError } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
}));

vi.mock('@/lib/logger.server', () => ({
  createLogger: vi.fn(() => ({ error: mockLoggerError })),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { POST } from './route';

describe('POST /api/log-error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 204 and logs the error for a valid request', async () => {
    const body = {
      message: 'Fatal render error',
      digest: 'digest123',
      stack: 'Error: Fatal render error\n  at Component',
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    const req = new NextRequest('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const response = await POST(req);

    expect(response.status).toBe(204);
    expect(mockLoggerError).toHaveBeenCalledWith('Fatal render error', {
      digest: 'digest123',
      stack: 'Error: Fatal render error\n  at Component',
      timestamp: '2024-01-01T00:00:00.000Z',
    });
  });

  it('returns 400 for an invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not valid json',
    });

    const response = await POST(req);

    expect(response.status).toBe(400);
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('uses a fallback message when the message field is absent', async () => {
    const req = new NextRequest('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digest: 'abc', stack: 'Error\n  at ...' }),
    });

    const response = await POST(req);

    expect(response.status).toBe(204);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Client-side render error',
      expect.objectContaining({ digest: 'abc' }),
    );
  });

  it('uses a fallback message when the message field is whitespace-only', async () => {
    const req = new NextRequest('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });

    const response = await POST(req);

    expect(response.status).toBe(204);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Client-side render error',
      expect.any(Object),
    );
  });

  it('omits digest and stack when they are not strings', async () => {
    const req = new NextRequest('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'oops', digest: 42, stack: null }),
    });

    const response = await POST(req);

    expect(response.status).toBe(204);
    expect(mockLoggerError).toHaveBeenCalledWith('oops', {
      digest: undefined,
      stack: undefined,
      timestamp: expect.any(String),
    });
  });

  it('truncates message, digest and stack to their maximum allowed lengths', async () => {
    const longMessage = 'x'.repeat(20_000);
    const longDigest = 'y'.repeat(2_000);
    const longStack = 'z'.repeat(100_000);

    const req = new NextRequest('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: longMessage,
        digest: longDigest,
        stack: longStack,
        timestamp: '2024-01-01T00:00:00.000Z',
      }),
    });

    const response = await POST(req);

    expect(response.status).toBe(204);
    const [loggedMessage, loggedMeta] = mockLoggerError.mock.calls[0] as [
      string,
      { digest: string; stack: string },
    ];
    expect(loggedMessage.length).toBe(10_000);
    expect(loggedMeta.digest.length).toBe(1_000);
    expect(loggedMeta.stack.length).toBe(50_000);
  });

  it('uses a server-generated timestamp when none is provided', async () => {
    const req = new NextRequest('http://localhost/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'no ts' }),
    });

    const response = await POST(req);

    expect(response.status).toBe(204);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'no ts',
      expect.objectContaining({ timestamp: expect.any(String) }),
    );
  });
});
