import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildKibanaDiscoverUrl, getKibanaUrl } from "./kibana-config";

/**
 * Tests for the Kibana deep-link helper (FARM-S353 / FARM-S354).
 *
 * Mutates `process.env.NEXT_PUBLIC_KIBANA_URL` per-case and restores the
 * original value after each test. The accessor is intentionally a thin
 * wrapper around `process.env`, so reading `process.env` at call time is
 * the supported way to vary configuration in unit tests (Next.js inlining
 * only applies in built bundles, not in Vitest).
 */
describe("kibana-config", () => {
  const ENV_KEY = "NEXT_PUBLIC_KIBANA_URL";
  let originalValue: string | undefined;

  beforeEach(() => {
    originalValue = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalValue;
    }
  });

  describe("getKibanaUrl", () => {
    it("returns undefined when the env var is unset", () => {
      delete process.env[ENV_KEY];
      expect(getKibanaUrl()).toBeUndefined();
    });

    it("returns undefined when the env var is an empty string", () => {
      process.env[ENV_KEY] = "";
      expect(getKibanaUrl()).toBeUndefined();
    });

    it("returns undefined when the env var contains only whitespace", () => {
      process.env[ENV_KEY] = "   ";
      expect(getKibanaUrl()).toBeUndefined();
    });

    it("returns the configured value as-is when no trailing slash is present", () => {
      process.env[ENV_KEY] = "https://kibana.example.com";
      expect(getKibanaUrl()).toBe("https://kibana.example.com");
    });

    it("strips a single trailing slash", () => {
      process.env[ENV_KEY] = "https://kibana.example.com/";
      expect(getKibanaUrl()).toBe("https://kibana.example.com");
    });

    it("strips multiple trailing slashes", () => {
      process.env[ENV_KEY] = "https://kibana.example.com////";
      expect(getKibanaUrl()).toBe("https://kibana.example.com");
    });
  });

  describe("buildKibanaDiscoverUrl", () => {
    it("returns undefined when the base URL is not configured", () => {
      delete process.env[ENV_KEY];
      expect(buildKibanaDiscoverUrl("logs-*")).toBeUndefined();
    });

    it("builds a discover URL with the index pattern interpolated into the _a state", () => {
      process.env[ENV_KEY] = "https://kibana.example.com";
      const url = buildKibanaDiscoverUrl("logs-*");
      expect(url).toBe(
        "https://kibana.example.com/app/discover#/?_a=(index:'logs-*')",
      );
    });

    it("uses the trimmed base URL (no double slash before /app)", () => {
      process.env[ENV_KEY] = "https://kibana.example.com/";
      const url = buildKibanaDiscoverUrl("logs-*");
      expect(url?.startsWith("https://kibana.example.com/app/")).toBe(true);
      expect(url).not.toContain("//app");
    });

    // Rison single-quoted-string escape: '!' must be doubled BEFORE "'" is
    // rewritten to "!'", otherwise the inserted '!' would be re-escaped.
    it("escapes a literal '!' to '!!' before URI-encoding", () => {
      process.env[ENV_KEY] = "https://kibana.example.com";
      const url = buildKibanaDiscoverUrl("logs!alert");
      // `encodeURIComponent` leaves `!` untouched (RFC3986 unreserved-ish),
      // so the doubled `!!` survives encoding verbatim.
      expect(url).toContain("logs!!alert");
    });

    // Without escaping, a "'" in the pattern would terminate the Rison
    // string early and let Kibana parse the rest as additional state.
    it("escapes a literal single quote to !' so it cannot break out of the Rison string", () => {
      process.env[ENV_KEY] = "https://kibana.example.com";
      const url = buildKibanaDiscoverUrl("logs'evil");
      // After Rison-escape: `logs!'evil` → URI-encoded: `logs!'evil`
      // (`!` and `'` are both safe per encodeURIComponent).
      expect(url).toContain("logs!'evil");
      // The closing `'` of the Rison string still wraps the whole pattern.
      expect(url?.endsWith("')")).toBe(true);
    });

    it("doubles '!' before escaping quotes (replacement order)", () => {
      process.env[ENV_KEY] = "https://kibana.example.com";
      const url = buildKibanaDiscoverUrl("a!'b");
      // Expected transformation: `a!'b` → `a!!!'b` (! doubled, then ' escaped).
      expect(url).toContain("a!!!'b");
    });

    it("URI-encodes characters that need encoding (e.g. spaces)", () => {
      process.env[ENV_KEY] = "https://kibana.example.com";
      const url = buildKibanaDiscoverUrl("logs with space");
      expect(url).toContain("logs%20with%20space");
    });
  });
});
