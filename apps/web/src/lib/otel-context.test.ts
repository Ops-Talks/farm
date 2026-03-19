import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// OTel API mock — declared before the module under test is imported.
// ---------------------------------------------------------------------------

const mockActiveSpan = {
  setAttribute: vi.fn(),
};

// The mock allows switching between "active span exists" and "no active span"
// per-test via mockReturnValue / mockReturnValueOnce.
const mockGetActiveSpan = vi.fn<() => typeof mockActiveSpan | null>(
  () => null,
);

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: () => mockGetActiveSpan(),
    getTracer: vi.fn(() => ({ startSpan: vi.fn() })),
  },
}));

// ---------------------------------------------------------------------------
// Module under test — re-imported fresh before each test so that module-level
// state (_ctx) is reset.  vi.resetModules() in beforeEach achieves this.
// ---------------------------------------------------------------------------

describe('otel-context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // Helper: import a fresh copy of the module for each test.
  async function importModule() {
    return import('./otel-context');
  }

  // ── setUserContext ─────────────────────────────────────────────────────────

  describe('setUserContext', () => {
    it('stores the user context in module state', async () => {
      const { setUserContext, getUserContext } = await importModule();
      setUserContext('u1', 'alice');
      expect(getUserContext()).toEqual({ userId: 'u1', username: 'alice', orgId: undefined });
    });

    it('stores orgId when provided', async () => {
      const { setUserContext, getUserContext } = await importModule();
      setUserContext('u2', 'bob', 'org-99');
      expect(getUserContext()).toEqual({ userId: 'u2', username: 'bob', orgId: 'org-99' });
    });

    it('sets user.id and user.name on the active span', async () => {
      mockGetActiveSpan.mockReturnValueOnce(mockActiveSpan);
      const { setUserContext } = await importModule();
      setUserContext('u3', 'carol', 'org-1');

      expect(mockActiveSpan.setAttribute).toHaveBeenCalledWith('user.id', 'u3');
      expect(mockActiveSpan.setAttribute).toHaveBeenCalledWith('user.name', 'carol');
    });

    it('sets org.id on the active span when orgId is provided', async () => {
      mockGetActiveSpan.mockReturnValueOnce(mockActiveSpan);
      const { setUserContext } = await importModule();
      setUserContext('u4', 'dave', 'org-42');

      expect(mockActiveSpan.setAttribute).toHaveBeenCalledWith('org.id', 'org-42');
    });

    it('does NOT set org.id when orgId is omitted', async () => {
      mockGetActiveSpan.mockReturnValueOnce(mockActiveSpan);
      const { setUserContext } = await importModule();
      setUserContext('u5', 'eve');

      // setAttribute should only be called for user.id and user.name
      const calls = mockActiveSpan.setAttribute.mock.calls.map((c) => c[0]);
      expect(calls).not.toContain('org.id');
    });

    it('does not throw when there is no active span', async () => {
      mockGetActiveSpan.mockReturnValueOnce(null);
      const { setUserContext } = await importModule();
      // Must not throw even though getActiveSpan() returns null.
      expect(() => setUserContext('u6', 'frank')).not.toThrow();
    });

    it('overwrites previously stored context', async () => {
      const { setUserContext, getUserContext } = await importModule();
      setUserContext('u1', 'alice', 'org-1');
      setUserContext('u2', 'bob', 'org-2');
      expect(getUserContext()).toEqual({ userId: 'u2', username: 'bob', orgId: 'org-2' });
    });
  });

  // ── clearUserContext ───────────────────────────────────────────────────────

  describe('clearUserContext', () => {
    it('removes the stored user context', async () => {
      const { setUserContext, clearUserContext, getUserContext } =
        await importModule();
      setUserContext('u1', 'alice');
      clearUserContext();
      expect(getUserContext()).toBeNull();
    });

    it('is safe to call when context was never set', async () => {
      const { clearUserContext, getUserContext } = await importModule();
      expect(() => clearUserContext()).not.toThrow();
      expect(getUserContext()).toBeNull();
    });

    it('is safe to call multiple times', async () => {
      const { clearUserContext, getUserContext } = await importModule();
      clearUserContext();
      clearUserContext();
      expect(getUserContext()).toBeNull();
    });
  });

  // ── getUserContext ─────────────────────────────────────────────────────────

  describe('getUserContext', () => {
    it('returns null initially', async () => {
      const { getUserContext } = await importModule();
      expect(getUserContext()).toBeNull();
    });

    it('returns a snapshot (not the internal reference)', async () => {
      const { setUserContext, getUserContext } = await importModule();
      setUserContext('u1', 'alice', 'org-1');

      const ctx1 = getUserContext();
      const ctx2 = getUserContext();

      // Each call should return a new object (defensive copy).
      expect(ctx1).not.toBe(ctx2);
      expect(ctx1).toEqual(ctx2);
    });
  });
});
