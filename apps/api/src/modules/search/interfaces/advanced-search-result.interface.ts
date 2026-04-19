/**
 * A single search result returned from the advanced search endpoint.
 * Maps an Elasticsearch hit (or a QuickSearchResult fallback) to a
 * normalized shape suitable for the front-end.
 */
export interface AdvancedSearchHit {
  /** UUID of the matched entity. */
  id: string;
  /** Entity type (component, team, documentation, environment, pipeline). */
  type: string;
  /** Primary display name of the entity. */
  name: string;
  /** Optional human-readable description. */
  description?: string;
  /** Tags associated with the entity. */
  tags?: string[];
  /** Kubernetes / platform namespace, if applicable. */
  namespace?: string;
  /** Highlighted excerpt fragments keyed by matched field. */
  highlights?: {
    name?: string[];
    description?: string[];
    tags?: string[];
  };
  /** Front-end navigation path for the entity. */
  url: string;
  /** Elasticsearch relevance score; undefined for database fallback results. */
  score?: number;
}

/**
 * Full response envelope returned by GET /search/advanced.
 * Includes paginated hits, aggregated facets, and the backend source indicator.
 */
export interface AdvancedSearchResult {
  /** Array of matched search hits for the current page. */
  hits: AdvancedSearchHit[];
  /** Total number of documents matching the query across all pages. */
  total: number;
  /** Current page number (1-based). */
  page: number;
  /** Maximum number of hits per page. */
  limit: number;
  /** Total number of pages. */
  totalPages: number;
  /** Aggregated facet counts for types, namespaces, and tags. */
  facets: {
    types: Array<{ key: string; count: number }>;
    namespaces: Array<{ key: string; count: number }>;
    tags: Array<{ key: string; count: number }>;
  };
  /**
   * Which backend served this result.
   * 'elasticsearch' = Elasticsearch was enabled and used.
   * 'database'      = Fell back to PostgreSQL ILIKE search.
   */
  source: "elasticsearch" | "database";
}
