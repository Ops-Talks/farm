import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "@elastic/elasticsearch";
import type {
  SearchDocument,
  SearchFilters,
  SearchBoostConfig,
  EsSearchResponse,
  EsHit,
  EsFacetBucket,
} from "./elasticsearch.types";

/** Name of the shared Elasticsearch index used by the Farm platform. */
const FARM_INDEX = "farm-search";

/**
 * Default boost weights applied to search fields when no custom config is provided.
 */
const DEFAULT_BOOST: SearchBoostConfig = {
  titleBoost: 3,
  tagsBoost: 2,
  descriptionBoost: 1,
  fuzziness: "AUTO",
};

/**
 * Service that wraps the official @elastic/elasticsearch Client.
 *
 * The client is only instantiated when the ELASTICSEARCH_URL environment
 * variable is set. All public methods are safe to call regardless of whether
 * Elasticsearch is configured — they become no-ops when the client is absent.
 */
@Injectable()
export class ElasticsearchService {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly client: Client | null;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>("elasticsearch.url") ?? "";

    if (url) {
      this.client = new Client({ node: url });
      this.logger.log(`Elasticsearch client initialized with node: ${url}`);
    } else {
      this.client = null;
      this.logger.warn(
        "ELASTICSEARCH_URL is not set — Elasticsearch indexing is disabled",
      );
    }
  }

  /**
   * Returns true when an Elasticsearch client has been successfully created.
   */
  isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * Performs a cluster health check to verify connectivity.
   *
   * Returns false (never throws) when the client is disabled or when the
   * cluster health call fails for any reason.
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      await this.client!.cluster.health({}, { requestTimeout: "3s" });
      return true;
    } catch (error) {
      this.logger.warn("Elasticsearch health check failed", error);
      return false;
    }
  }

  /**
   * Indexes a single document into the farm-search index.
   *
   * Silently returns when Elasticsearch is disabled. Errors are logged but not
   * re-thrown so that the caller's primary operation is never interrupted.
   *
   * @param doc - The normalized search document to index.
   */
  async index(doc: SearchDocument): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      await this.client!.index({
        index: FARM_INDEX,
        id: doc.id,
        document: doc,
      });
    } catch (error) {
      this.logger.error(
        `Failed to index document ${doc.id} (type: ${doc.type})`,
        error,
      );
    }
  }

  /**
   * Bulk-indexes an array of documents using Elasticsearch bulk API index (upsert) operations.
   *
   * Silently returns when Elasticsearch is disabled or when the array is empty.
   * Errors are logged but not re-thrown.
   *
   * @param docs - Array of normalized search documents to index.
   */
  async bulkIndex(docs: SearchDocument[]): Promise<void> {
    if (!this.isEnabled() || docs.length === 0) {
      return;
    }

    const operations = docs.flatMap((doc) => [
      { index: { _index: FARM_INDEX, _id: doc.id } },
      doc,
    ]);

    try {
      const response = await this.client!.bulk({ operations });

      if (response.errors) {
        this.logger.warn(
          `Bulk index completed with errors for ${docs.length} documents`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Bulk index failed for ${docs.length} documents`,
        error,
      );
    }
  }

  /**
   * Removes a document from the farm-search index by its ID.
   *
   * 404 responses (document not found) are intentionally ignored because the
   * document may never have been indexed. All other errors are logged but not
   * re-thrown.
   *
   * @param id - The UUID of the document to delete.
   */
  async deleteFromIndex(id: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      await this.client!.delete({ index: FARM_INDEX, id });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode;

      if (status === 404) {
        // Document was never indexed — this is a normal condition.
        return;
      }

      this.logger.error(`Failed to delete document ${id} from index`, error);
    }
  }

  /**
   * Executes a full-text search against the farm-search index.
   *
   * Returns an empty response when Elasticsearch is disabled. Errors are
   * logged and an empty response is returned so callers can fall back to the
   * PostgreSQL search path gracefully.
   *
   * @param query - The free-text search term.
   * @param filters - Optional scoping filters (types, namespace, tags, orgId, pagination).
   * @param config - Optional field boost configuration; defaults to titleBoost=3 tagsBoost=2 descriptionBoost=1.
   */
  async search(
    query: string,
    filters: SearchFilters,
    config?: SearchBoostConfig,
  ): Promise<EsSearchResponse> {
    const empty: EsSearchResponse = {
      hits: [],
      total: 0,
      facets: { types: [], namespaces: [], tags: [] },
    };

    if (!this.isEnabled()) {
      return empty;
    }

    const boost = config ?? DEFAULT_BOOST;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const from = (page - 1) * limit;

    // Build the filter clauses for the bool query.
    const filterClauses: Record<string, unknown>[] = [];

    if (filters.types && filters.types.length > 0) {
      filterClauses.push({ terms: { type: filters.types } });
    }

    if (filters.namespace) {
      filterClauses.push({ term: { namespace: filters.namespace } });
    }

    if (filters.tags && filters.tags.length > 0) {
      filterClauses.push({
        bool: {
          filter: filters.tags.map((tag) => ({ term: { tags: tag } })),
        },
      });
    }

    if (filters.orgId) {
      filterClauses.push({ term: { organizationId: filters.orgId } });
    }

    try {
      const response = await this.client!.search({
        index: FARM_INDEX,
        from,
        size: limit,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: [
                    `title^${boost.titleBoost}`,
                    `tags^${boost.tagsBoost}`,
                    `description^${boost.descriptionBoost}`,
                  ],
                  fuzziness: boost.fuzziness,
                },
              },
            ],
            filter: filterClauses,
          },
        },
        highlight: {
          fields: {
            title: {},
            description: {},
            tags: {},
          },
        },
        aggs: {
          types: {
            terms: { field: "type" },
          },
          namespaces: {
            terms: { field: "namespace" },
          },
          tags: {
            terms: { field: "tags" },
          },
        },
      });

      const totalValue = response.hits.total;
      const total =
        typeof totalValue === "number" ? totalValue : (totalValue?.value ?? 0);

      const hits: EsHit[] = response.hits.hits.map((hit) => {
        const source = hit._source as SearchDocument;
        const hl = hit.highlight as Record<string, string[]> | undefined; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion

        const fieldHighlights: EsHit["highlights"] = {};
        if (hl?.title) fieldHighlights.name = hl.title;
        if (hl?.description) fieldHighlights.description = hl.description;
        if (hl?.tags) fieldHighlights.tags = hl.tags;

        const hasHighlights = Object.keys(fieldHighlights).length > 0;

        return {
          id: hit._id ?? source.id,
          type: source.type,
          title: source.title,
          description: source.description,
          tags: source.tags,
          namespace: source.namespace,
          highlights: hasHighlights ? fieldHighlights : undefined,
          score: hit._score ?? 0,
        };
      });

      const aggregations = response.aggregations as
        | Record<string, { buckets: Array<{ key: string; doc_count: number }> }>
        | undefined;

      const typeBuckets: EsFacetBucket[] =
        aggregations?.types?.buckets?.map((b) => ({
          key: b.key,
          count: b.doc_count,
        })) ?? [];

      const namespaceBuckets: EsFacetBucket[] =
        aggregations?.namespaces?.buckets?.map((b) => ({
          key: b.key,
          count: b.doc_count,
        })) ?? [];

      const tagBuckets: EsFacetBucket[] =
        aggregations?.tags?.buckets?.map((b) => ({
          key: b.key,
          count: b.doc_count,
        })) ?? [];

      return {
        hits,
        total,
        facets: {
          types: typeBuckets,
          namespaces: namespaceBuckets,
          tags: tagBuckets,
        },
      };
    } catch (error) {
      this.logger.error("Elasticsearch search query failed", error);
      return empty;
    }
  }
}
