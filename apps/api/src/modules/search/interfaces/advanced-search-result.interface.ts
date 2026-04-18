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
  /** Primary display name / title of the entity. */
  title: string;
  /** Optional human-readable description. */
  description?: string;
  /** Tags associated with the entity. */
  tags?: string[];
  /** Kubernetes / platform namespace, if applicable. */
  namespace?: string;
  /** Highlighted excerpt fragments from matched fields. */
  highlights?: string[];
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
  /** Number of results per page. */
  limit: number;
  /** Aggregated facet counts for types and tags. */
  facets: {
    types: Array<{ key: string; count: number }>;
    tags: Array<{ key: string; count: number }>;
  };
  /**
   * Which backend served this result.
   * 'elasticsearch' = Elasticsearch was enabled and used.
   * 'database'      = Fell back to PostgreSQL ILIKE search.
   */
  source: "elasticsearch" | "database";
}
