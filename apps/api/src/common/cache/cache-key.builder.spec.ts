import { CacheKeyBuilder } from "./cache-key.builder";

describe("CacheKeyBuilder", () => {
  describe("org()", () => {
    it("builds a key with namespace and no additional parts", () => {
      expect(CacheKeyBuilder.org("org-123", "catalog")).toBe(
        "org:org-123:catalog",
      );
    });

    it("builds a key with one additional part", () => {
      expect(CacheKeyBuilder.org("org-123", "catalog", "components")).toBe(
        "org:org-123:catalog:components",
      );
    });

    it("builds a key with multiple additional parts", () => {
      expect(
        CacheKeyBuilder.org("org-abc", "pipelines", "runs", "page:0"),
      ).toBe("org:org-abc:pipelines:runs:page:0");
    });

    it("treats each argument as a distinct segment", () => {
      const key = CacheKeyBuilder.org("org-1", "ns", "a", "b", "c");
      expect(key).toBe("org:org-1:ns:a:b:c");
    });
  });

  describe("orgPrefix()", () => {
    it("builds a prefix ending with ':'", () => {
      expect(CacheKeyBuilder.orgPrefix("org-123", "catalog")).toBe(
        "org:org-123:catalog:",
      );
    });

    it("returns a prefix that matches keys built by org() for the same org and namespace", () => {
      const prefix = CacheKeyBuilder.orgPrefix("org-xyz", "catalog");
      const key = CacheKeyBuilder.org("org-xyz", "catalog", "components");
      expect(key.startsWith(prefix)).toBe(true);
    });

    it("does not match keys from a different org", () => {
      const prefix = CacheKeyBuilder.orgPrefix("org-1", "catalog");
      const key = CacheKeyBuilder.org("org-2", "catalog", "components");
      expect(key.startsWith(prefix)).toBe(false);
    });

    it("does not match keys from a different namespace", () => {
      const prefix = CacheKeyBuilder.orgPrefix("org-1", "catalog");
      const key = CacheKeyBuilder.org("org-1", "pipelines", "runs");
      expect(key.startsWith(prefix)).toBe(false);
    });
  });
});
