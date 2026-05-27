import { TenantCacheService } from "./tenant-cache.service";
import { Cache } from "cache-manager";

describe("TenantCacheService", () => {
  let service: TenantCacheService;
  let mockCacheManager: jest.Mocked<
    Pick<Cache, "get" | "set" | "del"> & {
      store?: { keys?: jest.Mock };
    }
  >;

  beforeEach(() => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    service = new TenantCacheService(mockCacheManager as unknown as Cache);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("get()", () => {
    it("delegates to cacheManager.get with the provided key", async () => {
      mockCacheManager.get.mockResolvedValueOnce({ id: "1" });
      const result = await service.get<{ id: string }>("org:org-1:catalog:x");
      expect(mockCacheManager.get).toHaveBeenCalledWith("org:org-1:catalog:x");
      expect(result).toEqual({ id: "1" });
    });

    it("returns undefined when the key is not present", async () => {
      mockCacheManager.get.mockResolvedValueOnce(undefined);
      const result = await service.get("org:org-1:catalog:missing");
      expect(result).toBeUndefined();
    });
  });

  describe("set()", () => {
    it("delegates to cacheManager.set with key, value and ttl", async () => {
      mockCacheManager.set.mockResolvedValueOnce(undefined);
      await service.set("org:org-1:catalog:x", { data: true }, 5000);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        "org:org-1:catalog:x",
        { data: true },
        5000,
      );
    });

    it("calls cacheManager.set without ttl when omitted", async () => {
      mockCacheManager.set.mockResolvedValueOnce(undefined);
      await service.set("org:org-1:catalog:x", "value");
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        "org:org-1:catalog:x",
        "value",
        undefined,
      );
    });
  });

  describe("del()", () => {
    it("delegates to cacheManager.del with the provided key", async () => {
      mockCacheManager.del.mockResolvedValueOnce(undefined);
      await service.del("org:org-1:catalog:x");
      expect(mockCacheManager.del).toHaveBeenCalledWith("org:org-1:catalog:x");
    });
  });

  describe("invalidateByPrefix()", () => {
    it("is a no-op when the store does not expose keys()", async () => {
      // Default in-memory store — no store.keys method.
      await expect(
        service.invalidateByPrefix("org:org-1:catalog:"),
      ).resolves.toBeUndefined();
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it("deletes all keys returned by store.keys() matching the prefix", async () => {
      const mockKeys = jest
        .fn()
        .mockResolvedValueOnce(["org:org-1:catalog:a", "org:org-1:catalog:b"]);
      mockCacheManager.store = { keys: mockKeys };
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.invalidateByPrefix("org:org-1:catalog:");

      expect(mockKeys).toHaveBeenCalledWith("org:org-1:catalog:*");
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
      expect(mockCacheManager.del).toHaveBeenCalledWith("org:org-1:catalog:a");
      expect(mockCacheManager.del).toHaveBeenCalledWith("org:org-1:catalog:b");
    });

    it("does not call del when store.keys() returns an empty array", async () => {
      const mockKeys = jest.fn().mockResolvedValueOnce([]);
      mockCacheManager.store = { keys: mockKeys };

      await service.invalidateByPrefix("org:org-1:catalog:");

      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it("does not throw when store.keys() rejects — logs a warning instead", async () => {
      const mockKeys = jest
        .fn()
        .mockRejectedValueOnce(new Error("redis connection error"));
      mockCacheManager.store = { keys: mockKeys };

      await expect(
        service.invalidateByPrefix("org:org-1:catalog:"),
      ).resolves.toBeUndefined();
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });

    it("only deletes keys for the specified prefix, not other tenant keys", async () => {
      const mockKeys = jest.fn().mockResolvedValueOnce(["org:org-1:catalog:x"]);
      mockCacheManager.store = { keys: mockKeys };
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.invalidateByPrefix("org:org-1:catalog:");

      // Only org-1's key is deleted; org-2's keys are untouched.
      expect(mockCacheManager.del).toHaveBeenCalledTimes(1);
      expect(mockCacheManager.del).not.toHaveBeenCalledWith(
        "org:org-2:catalog:x",
      );
    });
  });
});
