import { PerUserThrottlerGuard } from "./per-user-throttler.guard";

describe("PerUserThrottlerGuard", () => {
  let guard: PerUserThrottlerGuard;

  beforeEach(() => {
    // Instantiate without calling super constructor dependencies
    guard = Object.create(
      PerUserThrottlerGuard.prototype,
    ) as PerUserThrottlerGuard;
  });

  describe("getTracker", () => {
    it("should return the userId when the request has an authenticated user with userId", async () => {
      const req = {
        user: { userId: "user-uuid-1" },
        ip: "192.168.1.1",
      };

      const tracker = await guard["getTracker"](
        req as unknown as Record<string, unknown>,
      );

      expect(tracker).toBe("user-uuid-1");
    });

    it("should return the user id when the request has an authenticated user with id field", async () => {
      const req = {
        user: { id: "user-uuid-2" },
        ip: "192.168.1.1",
      };

      const tracker = await guard["getTracker"](
        req as unknown as Record<string, unknown>,
      );

      expect(tracker).toBe("user-uuid-2");
    });

    it("should prefer userId over id when both are present", async () => {
      const req = {
        user: { userId: "user-uuid-1", id: "user-uuid-2" },
        ip: "192.168.1.1",
      };

      const tracker = await guard["getTracker"](
        req as unknown as Record<string, unknown>,
      );

      expect(tracker).toBe("user-uuid-1");
    });

    it("should return the client IP when the user is not authenticated", async () => {
      const req = {
        user: undefined,
        ip: "10.0.0.42",
      };

      const tracker = await guard["getTracker"](
        req as unknown as Record<string, unknown>,
      );

      expect(tracker).toBe("10.0.0.42");
    });

    it("should return the client IP when user has no id fields", async () => {
      const req = {
        user: {},
        ip: "10.0.0.99",
      };

      const tracker = await guard["getTracker"](
        req as unknown as Record<string, unknown>,
      );

      expect(tracker).toBe("10.0.0.99");
    });
  });
});
