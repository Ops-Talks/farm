import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";

/** Allowed health states reported by Elasticsearch's _cat/indices API. */
export type IndexHealth = "green" | "yellow" | "red" | "unknown";

/**
 * Normalized stats for a single resolved Elasticsearch index.
 */
export interface IndexStats {
  /** The pattern requested by the caller (e.g. "logs-app-*"). */
  pattern: string;
  /** The concrete index name returned by Elasticsearch. */
  index: string;
  /** Cluster-reported health for the index. */
  health: IndexHealth;
  /** ES "status" field, e.g. "open". */
  status: string;
  /** Document count parsed from the ES "docs.count" string. */
  docsCount: number;
  /** Raw human-readable store size (e.g. "12.3kb"). */
  storeSize: string;
}

/**
 * Result envelope for {@link ElasticsearchIndexStatsService.getIndexStats}.
 *
 * `reachable: false` is returned when the cluster URL is not configured or
 * any of the per-pattern requests fails (network, timeout, non-2xx).
 */
export type IndexStatsResult =
  | { reachable: false }
  | { reachable: true; stats: IndexStats[] };

/** Raw row returned by ES _cat/indices API in JSON format. */
interface CatIndicesEntry {
  index?: string;
  health?: string;
  status?: string;
  "docs.count"?: string;
  "store.size"?: string;
}

/** Timeout for each ES request, in milliseconds. */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Service that queries live index statistics from an Elasticsearch cluster
 * via the _cat/indices REST API (FARM-T402).
 *
 * Designed to degrade gracefully: any failure (no URL configured, network
 * error, timeout, non-2xx response) returns `{ reachable: false }` rather
 * than throwing, so callers can render a "cluster unreachable" UI state.
 */
@Injectable()
export class ElasticsearchIndexStatsService {
  private readonly logger = new Logger(ElasticsearchIndexStatsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cb: CircuitBreakerService,
  ) {}

  /**
   * Returns live stats for one or more Elasticsearch index patterns.
   *
   * @param patterns - Index names or wildcard patterns (e.g. "logs-app-*").
   * @param esUrl - Optional override for the cluster base URL.
   *                When omitted, falls back to ELASTICSEARCH_URL.
   */
  async getIndexStats(
    patterns: string[],
    esUrl?: string | null,
  ): Promise<IndexStatsResult> {
    if (esUrl && !this.isOverrideUrlSafe(esUrl)) {
      this.logger.warn(
        `Rejecting Elasticsearch override URL "${esUrl}" (invalid scheme or private/loopback host). Configure ELASTICSEARCH_ALLOW_PRIVATE_HOSTS=true to opt in.`,
      );
      return { reachable: false };
    }

    const baseUrl = this.resolveBaseUrl(esUrl);
    if (!baseUrl) {
      this.logger.debug(
        "Elasticsearch URL not configured; returning unreachable",
      );
      return { reachable: false };
    }

    const headers = this.buildHeaders(baseUrl);

    // Issue per-pattern requests in parallel so total latency is dominated by
    // the slowest cluster response rather than the sum of all patterns.
    const settled = await Promise.all(
      patterns.map((pattern) => this.fetchPattern(baseUrl, pattern, headers)),
    );

    const stats: IndexStats[] = [];
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const entries = settled[i];
      if (entries === null) {
        // Network/timeout/non-2xx — degrade the entire call.
        return { reachable: false };
      }
      if (entries.length === 0) {
        stats.push(this.missingPlaceholder(pattern));
        continue;
      }
      for (const entry of entries) {
        stats.push(this.normalizeEntry(pattern, entry));
      }
    }

    return { reachable: true, stats };
  }

  /**
   * Resolves the effective cluster base URL, preferring the per-record
   * override and falling back to environment configuration.
   */
  private resolveBaseUrl(override?: string | null): string | null {
    if (override) {
      return override;
    }
    const fromConfig =
      this.configService.get<string>("ELASTICSEARCH_URL") ??
      this.configService.get<string>("elasticsearch.url");
    return fromConfig && fromConfig.length > 0 ? fromConfig : null;
  }

  /**
   * Builds the request headers, including Basic auth when credentials are
   * configured via the ELASTICSEARCH_USERNAME / ELASTICSEARCH_PASSWORD vars.
   *
   * To prevent leaking credentials to attacker-controlled hosts via per-record
   * `esUrl` overrides, the Authorization header is only attached when the
   * outbound request targets the same host as the configured cluster URL.
   */
  private buildHeaders(targetBaseUrl: string): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };

    const username =
      this.configService.get<string>("ELASTICSEARCH_USERNAME") ??
      this.configService.get<string>("elasticsearch.username") ??
      "";
    const password =
      this.configService.get<string>("ELASTICSEARCH_PASSWORD") ??
      this.configService.get<string>("elasticsearch.password") ??
      "";

    if (!username || !password) {
      return headers;
    }

    const configuredUrl =
      this.configService.get<string>("ELASTICSEARCH_URL") ??
      this.configService.get<string>("elasticsearch.url") ??
      "";
    if (!configuredUrl) {
      // No configured cluster to compare against; refuse to attach auth.
      this.logger.debug(
        "Skipping Elasticsearch Basic auth: no configured ELASTICSEARCH_URL to verify host against",
      );
      return headers;
    }

    let configHost: string;
    let targetHost: string;
    try {
      configHost = new URL(configuredUrl).host.toLowerCase();
      targetHost = new URL(targetBaseUrl).host.toLowerCase();
    } catch {
      return headers;
    }

    if (configHost !== targetHost) {
      this.logger.warn(
        `Skipping Elasticsearch Basic auth: target host "${targetHost}" does not match configured cluster host "${configHost}"`,
      );
      return headers;
    }

    const token = Buffer.from(`${username}:${password}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
    return headers;
  }

  /**
   * Hostname patterns considered private/loopback and therefore unsafe as
   * targets for user-supplied per-record `esUrl` overrides. Blocked by
   * default to mitigate SSRF and credential exfiltration; can be opted in
   * via `ELASTICSEARCH_ALLOW_PRIVATE_HOSTS=true`.
   *
   * Octet sub-pattern is constrained to 0-255 so out-of-range values
   * (e.g. `127.999.0.1`) are not falsely classified as loopback IPs.
   */
  private static readonly OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)";
  private static readonly PRIVATE_HOST_PATTERNS: RegExp[] = [
    /^localhost$/i,
    /\.localhost$/i,
    new RegExp(
      `^127\\.${ElasticsearchIndexStatsService.OCTET}\\.${ElasticsearchIndexStatsService.OCTET}\\.${ElasticsearchIndexStatsService.OCTET}$`,
    ),
    new RegExp(
      `^10\\.${ElasticsearchIndexStatsService.OCTET}\\.${ElasticsearchIndexStatsService.OCTET}\\.${ElasticsearchIndexStatsService.OCTET}$`,
    ),
    new RegExp(
      `^192\\.168\\.${ElasticsearchIndexStatsService.OCTET}\\.${ElasticsearchIndexStatsService.OCTET}$`,
    ),
    new RegExp(
      `^172\\.(?:1[6-9]|2\\d|3[01])\\.${ElasticsearchIndexStatsService.OCTET}\\.${ElasticsearchIndexStatsService.OCTET}$`,
    ),
    new RegExp(
      `^169\\.254\\.${ElasticsearchIndexStatsService.OCTET}\\.${ElasticsearchIndexStatsService.OCTET}$`,
    ),
    /^0\.0\.0\.0$/,
    /^::1?$/,
    /^fc[0-9a-f]{2}:/i,
    /^fd[0-9a-f]{2}:/i,
    /^fe[89ab][0-9a-f]:/i,
  ];

  /**
   * Validates a per-record `esUrl` override before any outbound request is
   * issued. Rejects non-http(s) schemes and (by default) private/loopback
   * hosts to mitigate SSRF.
   */
  private isOverrideUrlSafe(url: string): boolean {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const allowFlag: unknown =
      this.configService.get<unknown>("ELASTICSEARCH_ALLOW_PRIVATE_HOSTS") ??
      this.configService.get<unknown>("elasticsearch.allowPrivateHosts");
    if (allowFlag === "true" || allowFlag === true || allowFlag === "1") {
      return true;
    }
    const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
    for (const pattern of ElasticsearchIndexStatsService.PRIVATE_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Issues the GET _cat/indices request for a single pattern.
   *
   * Returns the parsed array on success, or `null` to signal the caller
   * to short-circuit into `{ reachable: false }`.
   */
  private async fetchPattern(
    baseUrl: string,
    pattern: string,
    headers: Record<string, string>,
  ): Promise<CatIndicesEntry[] | null> {
    const url = `${baseUrl.replace(/\/+$/, "")}/_cat/indices/${encodeURIComponent(
      pattern,
    )}?format=json&h=index,health,status,docs.count,store.size`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await this.cb.fire("elasticsearch-index", () =>
        globalThis.fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        }),
      );

      if (!response.ok) {
        if (response.status === 404) {
          // A 404 for an index pattern commonly means the cluster is reachable
          // but the pattern matched no indices. Return an empty array so the
          // caller can surface a "missing" placeholder row instead of marking
          // the whole cluster as unreachable.
          this.logger.debug(
            `Elasticsearch returned 404 for pattern "${pattern}"`,
          );
          return [];
        }
        this.logger.warn(
          `Elasticsearch responded with HTTP ${response.status} for pattern "${pattern}"`,
        );
        return null;
      }

      const body = (await response.json()) as CatIndicesEntry[];
      return Array.isArray(body) ? body : [];
    } catch (error) {
      const name = (error as Error)?.name;
      if (name === "AbortError") {
        this.logger.warn(
          `Elasticsearch request for pattern "${pattern}" timed out after ${REQUEST_TIMEOUT_MS}ms`,
        );
      } else {
        this.logger.warn(
          `Elasticsearch request for pattern "${pattern}" failed`,
          error,
        );
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Synthesizes a placeholder row for a pattern that matched no indices. */
  private missingPlaceholder(pattern: string): IndexStats {
    return {
      pattern,
      index: pattern,
      health: "unknown",
      status: "missing",
      docsCount: 0,
      storeSize: "0b",
    };
  }

  /** Normalizes a raw _cat/indices row into our typed shape. */
  private normalizeEntry(pattern: string, entry: CatIndicesEntry): IndexStats {
    return {
      pattern,
      index: entry.index ?? pattern,
      health: this.normalizeHealth(entry.health),
      status: entry.status ?? "unknown",
      docsCount: parseInt(entry["docs.count"] ?? "0", 10) || 0,
      storeSize: entry["store.size"] ?? "0b",
    };
  }

  private normalizeHealth(value: string | undefined): IndexHealth {
    switch (value) {
      case "green":
      case "yellow":
      case "red":
        return value;
      default:
        return "unknown";
    }
  }
}
