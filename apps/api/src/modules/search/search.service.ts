import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";
import { ElasticsearchService } from "../elasticsearch/elasticsearch.service";
import type {
  SearchBoostConfig,
  SearchFilters,
} from "../elasticsearch/elasticsearch.types";
import { SearchConfig } from "./entities/search-config.entity";
import { AdvancedSearchQueryDto } from "./dto/advanced-search-query.dto";
import { UpdateSearchConfigDto } from "./dto/update-search-config.dto";
import type {
  AdvancedSearchHit,
  AdvancedSearchResult,
} from "./interfaces/advanced-search-result.interface";

export interface QuickSearchResult {
  type: "component" | "team" | "documentation" | "environment" | "pipeline";
  id: string;
  name: string;
  description?: string;
  url: string;
}

/**
 * Hardcoded boost defaults used when no SearchConfig row exists in the database.
 */
const FALLBACK_BOOST: SearchBoostConfig = {
  titleBoost: 3,
  tagsBoost: 2,
  descriptionBoost: 1,
  fuzziness: "AUTO",
};

/**
 * Maps an entity type and ID to the front-end navigation path.
 */
function buildUrl(type: string, id: string): string {
  const paths: Record<string, string> = {
    component: "/catalog",
    team: "/teams",
    documentation: "/docs",
    environment: "/environments",
    pipeline: "/pipelines",
  };
  const prefix = paths[type] ?? "/catalog";
  return `${prefix}/${id}`;
}

/**
 * Service for performing cross-entity quick search and advanced faceted search.
 * Searches components, teams, documentation, environments, and pipelines.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Documentation)
    private readonly docRepo: Repository<Documentation>,
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
    @InjectRepository(Pipeline)
    private readonly pipelineRepo: Repository<Pipeline>,
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(SearchConfig)
    private readonly searchConfigRepo: Repository<SearchConfig>,
  ) {}

  /**
   * Performs a case-insensitive search across all entity types.
   * Returns up to `limit` combined results scoped to the given organization.
   *
   * @param query - Search term (minimum 2 characters)
   * @param limit - Maximum total results to return (default 10)
   * @param orgId - Optional organization UUID to scope results
   */
  async quickSearch(
    query: string,
    limit = 10,
    orgId?: string,
  ): Promise<QuickSearchResult[]> {
    if (!query || query.trim().length < 2) return [];
    const q = `%${query.trim()}%`;
    const perType = Math.max(2, Math.ceil(limit / 5));

    const componentQb = this.componentRepo
      .createQueryBuilder("c")
      .where("(c.name ILIKE :q OR c.description ILIKE :q)", { q });
    if (orgId) componentQb.andWhere("c.organizationId = :orgId", { orgId });

    const teamQb = this.teamRepo
      .createQueryBuilder("t")
      .where("t.name ILIKE :q", { q });
    if (orgId) teamQb.andWhere("t.organizationId = :orgId", { orgId });

    const docQb = this.docRepo
      .createQueryBuilder("d")
      .where("d.title ILIKE :q", { q });
    if (orgId) docQb.andWhere("d.organizationId = :orgId", { orgId });

    const envQb = this.envRepo
      .createQueryBuilder("e")
      .where("e.name ILIKE :q", { q });
    if (orgId) envQb.andWhere("e.organizationId = :orgId", { orgId });

    const pipelineQb = this.pipelineRepo
      .createQueryBuilder("p")
      .where("p.name ILIKE :q", { q });
    if (orgId) pipelineQb.andWhere("p.organizationId = :orgId", { orgId });

    const [components, teams, docs, environments, pipelines] =
      await Promise.all([
        componentQb.limit(perType).getMany(),
        teamQb.limit(perType).getMany(),
        docQb.limit(perType).getMany(),
        envQb.limit(perType).getMany(),
        pipelineQb.limit(perType).getMany(),
      ]);
    const results: QuickSearchResult[] = [
      ...components.map((c) => ({
        type: "component" as const,
        id: c.id,
        name: c.name,
        description: c.description ?? undefined,
        url: `/catalog/${c.id}`,
      })),
      ...teams.map((t) => ({
        type: "team" as const,
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
        url: `/teams/${t.id}`,
      })),
      ...docs.map((d) => ({
        type: "documentation" as const,
        id: d.id,
        name: d.title,
        url: `/docs/${d.id}`,
      })),
      ...environments.map((e) => ({
        type: "environment" as const,
        id: e.id,
        name: e.name,
        url: `/environments/${e.id}`,
      })),
      ...pipelines.map((p) => ({
        type: "pipeline" as const,
        id: p.id,
        name: p.name,
        url: `/pipelines/${p.id}`,
      })),
    ];
    return results.slice(0, limit);
  }

  // ---------------------------------------------------------------------------
  // Advanced search (FARM-S316 + FARM-S317)
  // ---------------------------------------------------------------------------

  /**
   * Loads the most specific SearchConfig for the given organization, falling
   * back to the global config (organizationId IS NULL) when no org-specific
   * row exists.  Returns null if neither row exists.
   *
   * @param orgId - Optional organization UUID.
   */
  async getConfig(orgId?: string): Promise<SearchConfig | null> {
    if (orgId) {
      const orgConfig = await this.searchConfigRepo.findOne({
        where: { organizationId: orgId },
      });
      if (orgConfig) return orgConfig;
    }

    return this.searchConfigRepo.findOne({
      where: { organizationId: IsNull() },
    });
  }

  /**
   * Creates or updates the SearchConfig for the given organization scope.
   * Passing no orgId targets the global default row.
   *
   * @param dto    - Partial config values to apply.
   * @param orgId  - Optional organization UUID (null targets global default).
   */
  async upsertConfig(
    dto: UpdateSearchConfigDto,
    orgId?: string,
  ): Promise<SearchConfig> {
    const existing = await this.searchConfigRepo.findOne({
      where: { organizationId: orgId ?? IsNull() },
    });

    if (existing) {
      if (dto.titleBoost !== undefined) existing.titleBoost = dto.titleBoost;
      if (dto.tagsBoost !== undefined) existing.tagsBoost = dto.tagsBoost;
      if (dto.descriptionBoost !== undefined)
        existing.descriptionBoost = dto.descriptionBoost;
      if (dto.fuzziness !== undefined) existing.fuzziness = dto.fuzziness;
      return this.searchConfigRepo.save(existing);
    }

    const created = this.searchConfigRepo.create({
      organizationId: orgId ?? null,
      titleBoost: dto.titleBoost ?? FALLBACK_BOOST.titleBoost,
      tagsBoost: dto.tagsBoost ?? FALLBACK_BOOST.tagsBoost,
      descriptionBoost: dto.descriptionBoost ?? FALLBACK_BOOST.descriptionBoost,
      fuzziness: dto.fuzziness ?? FALLBACK_BOOST.fuzziness,
    });
    return this.searchConfigRepo.save(created);
  }

  /**
   * Executes an advanced search with faceting, pagination, and typo tolerance.
   *
   * When Elasticsearch is enabled the query is executed against the
   * farm-search index using boost weights from the resolved SearchConfig.
   *
   * When Elasticsearch is disabled the method falls back to the existing
   * quickSearch() PostgreSQL path and wraps the result in the standard
   * AdvancedSearchResult envelope (no facets, source='database').
   *
   * @param dto   - Validated query parameters from the request.
   * @param orgId - Optional organization UUID used to scope results.
   */
  async advancedSearch(
    dto: AdvancedSearchQueryDto,
    orgId?: string,
  ): Promise<AdvancedSearchResult> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    // Resolve boost configuration, falling back through DB then hardcoded defaults.
    const storedConfig = await this.getConfig(orgId);
    const boost: SearchBoostConfig = storedConfig
      ? {
          titleBoost: storedConfig.titleBoost,
          tagsBoost: storedConfig.tagsBoost,
          descriptionBoost: storedConfig.descriptionBoost,
          fuzziness: storedConfig.fuzziness,
        }
      : FALLBACK_BOOST;

    if (this.elasticsearchService.isEnabled()) {
      const filters: SearchFilters = {
        orgId,
        page,
        limit,
        types: dto.types as SearchFilters["types"],
        namespace: dto.namespace,
        tags: dto.tags,
      };

      const esResponse = await this.elasticsearchService.search(
        dto.q,
        filters,
        boost,
      );

      const hits: AdvancedSearchHit[] = esResponse.hits.map((hit) => ({
        id: hit.id,
        type: hit.type,
        title: hit.title,
        description: hit.description,
        tags: hit.tags,
        namespace: hit.namespace,
        highlights: hit.highlights,
        url: buildUrl(hit.type, hit.id),
        score: hit.score,
      }));

      return {
        hits,
        total: esResponse.total,
        page,
        limit,
        facets: {
          types: esResponse.facets.types,
          tags: esResponse.facets.tags,
        },
        source: "elasticsearch",
      };
    }

    // ----- Database fallback -----
    try {
      const quickResults = await this.quickSearch(dto.q, limit, orgId);

      const filtered =
        dto.types && dto.types.length > 0
          ? quickResults.filter((r) => dto.types!.includes(r.type))
          : quickResults;

      const hits: AdvancedSearchHit[] = filtered.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.name,
        description: r.description,
        url: r.url,
      }));

      return {
        hits,
        total: hits.length,
        page,
        limit,
        facets: { types: [], tags: [] },
        source: "database",
      };
    } catch (error) {
      // The database fallback query failed (e.g. ILIKE is unsupported on the
      // current driver).  Return an empty result set rather than a 500 so
      // callers receive a valid AdvancedSearchResult envelope.
      this.logger.warn(
        "Database fallback search failed, returning empty result",
        error,
      );
      return {
        hits: [],
        total: 0,
        page,
        limit,
        facets: { types: [], tags: [] },
        source: "database",
      };
    }
  }
}
