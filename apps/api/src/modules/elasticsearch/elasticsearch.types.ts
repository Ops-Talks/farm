/**
 * Supported document types that can be indexed in Elasticsearch.
 */
export type SearchDocumentType =
  | "component"
  | "team"
  | "documentation"
  | "environment"
  | "pipeline";

/**
 * Represents a normalized document stored in the farm-search Elasticsearch index.
 */
export interface SearchDocument {
  /** UUID of the original entity. */
  id: string;
  /** Entity type used for faceting and filtering. */
  type: SearchDocumentType;
  /** Primary display name / title of the entity. */
  title: string;
  /** Optional human-readable description. */
  description?: string;
  /** Tags associated with the entity for boosted matching. */
  tags?: string[];
  /** Kubernetes / platform namespace, if applicable. */
  namespace?: string;
  /** Organization UUID for multi-tenant scoping. */
  organizationId?: string;
  /** ISO 8601 timestamp of the last update. */
  updatedAt: string;
}

/**
 * Filters that can be applied to an Elasticsearch search query.
 */
export interface SearchFilters {
  /** Restrict results to the given entity types. */
  types?: SearchDocumentType[];
  /** Restrict results to a specific namespace. */
  namespace?: string;
  /** Restrict results to documents that have all of the given tags. */
  tags?: string[];
  /** Organization UUID to scope results. */
  orgId?: string;
  /** Page number for pagination (1-based). */
  page?: number;
  /** Maximum number of results per page. */
  limit?: number;
}

/**
 * Field-level boost weights and fuzziness settings for the search query.
 */
export interface SearchBoostConfig {
  /** Boost multiplier applied to the title field. */
  titleBoost: number;
  /** Boost multiplier applied to the tags field. */
  tagsBoost: number;
  /** Boost multiplier applied to the description field. */
  descriptionBoost: number;
  /** Elasticsearch fuzziness value (e.g. 'AUTO', '1', '2'). */
  fuzziness: string;
}

/**
 * A single search result hit returned from Elasticsearch.
 */
export interface EsHit {
  /** UUID of the matched entity. */
  id: string;
  /** Entity type of the matched document. */
  type: SearchDocumentType;
  /** Title of the matched document. */
  title: string;
  /** Optional description of the matched document. */
  description?: string;
  /** Tags associated with the matched document. */
  tags?: string[];
  /** Namespace of the matched document. */
  namespace?: string;
  /** Highlighted excerpt fragments from the matched fields. */
  highlights?: string[];
  /** Elasticsearch relevance score. */
  score: number;
}

/**
 * A single bucket in a facet aggregation result.
 */
export interface EsFacetBucket {
  /** Bucket key (e.g. entity type name or tag value). */
  key: string;
  /** Number of documents in this bucket. */
  count: number;
}

/**
 * Full response returned by the ElasticsearchService.search() method.
 */
export interface EsSearchResponse {
  /** Array of matched search result hits. */
  hits: EsHit[];
  /** Total number of documents matching the query. */
  total: number;
  /** Aggregated facets for filtering the UI. */
  facets: {
    /** Breakdown of result counts by entity type. */
    types: EsFacetBucket[];
    /** Breakdown of result counts by tag. */
    tags: EsFacetBucket[];
  };
}
