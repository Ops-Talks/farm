import { Controller, Get, HttpStatus, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ComponentElasticsearchIndexService } from "./component-elasticsearch-index.service";
import {
  ElasticsearchIndexStatsService,
  IndexStats,
} from "./elasticsearch-index-stats.service";

/**
 * Per-index entry returned inside an {@link OverviewComponentGroup}.
 */
export interface OverviewIndexEntry {
  indexId: string;
  indexPattern: string;
  esUrl: string | null;
  reachable: boolean;
  /** Present iff the cluster was reachable for this entry's URL group. */
  stats?: IndexStats;
}

/**
 * Group of Elasticsearch index entries belonging to a single catalog
 * component. Always contains at least one entry.
 */
export interface OverviewComponentGroup {
  componentId: string;
  componentName: string;
  indices: OverviewIndexEntry[];
}

/**
 * Admin-only aggregate view over every Elasticsearch index link in the
 * system, grouped by their owning catalog component (FARM-T407).
 *
 * Designed to be cheap regardless of fleet size:
 *   - Single TypeORM query with a left join on `component` (no N+1).
 *   - Stats fetched in batches per unique `esUrl`, reusing connections.
 *   - Multi-tenant aware via the `OrgContextInterceptor`: when an
 *     `X-Organization-Id` header is provided and validated, the result is
 *     scoped to that organization; otherwise the global view is returned.
 */
@ApiTags("Elasticsearch Indices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("elasticsearch/indices")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden - User does not have the 'admin' role.",
  type: ErrorResponseDto,
})
export class ElasticsearchIndicesOverviewController {
  constructor(
    private readonly indexService: ComponentElasticsearchIndexService,
    private readonly statsService: ElasticsearchIndexStatsService,
  ) {}

  /**
   * Returns every linked Elasticsearch index across all components,
   * grouped and sorted for deterministic UI rendering.
   */
  @Get()
  @Roles("admin")
  @ApiOperation({
    summary: "Admin overview of all Elasticsearch indices grouped by component",
  })
  @ApiOkResponse({
    description:
      "Successfully retrieved index groups. Components with no linked indices are omitted.",
  })
  async getOverview(
    @Req() req: RequestWithOrg,
  ): Promise<OverviewComponentGroup[]> {
    const groups = await this.indexService.findAllGroupedByComponent(
      req.organizationId ?? null,
    );

    if (groups.length === 0) {
      return [];
    }

    // Bucket every record across all groups by its effective esUrl so we
    // can issue one stats request per cluster URL instead of one per index.
    const urlBuckets = new Map<
      string,
      {
        esUrl: string | null;
        patterns: Set<string>;
      }
    >();
    const urlKey = (esUrl: string | null): string => esUrl ?? "__default__";

    for (const group of groups) {
      for (const record of group.records) {
        const key = urlKey(record.esUrl);
        let bucket = urlBuckets.get(key);
        if (!bucket) {
          bucket = { esUrl: record.esUrl, patterns: new Set<string>() };
          urlBuckets.set(key, bucket);
        }
        bucket.patterns.add(record.indexPattern);
      }
    }

    // Resolve stats per URL bucket. The result map is keyed by URL bucket
    // key and stores either a per-pattern stats lookup, or `null` to mean
    // "cluster unreachable" for every pattern in this bucket.
    const resolved = new Map<string, Map<string, IndexStats> | null>();
    for (const [key, bucket] of urlBuckets) {
      const patterns = Array.from(bucket.patterns);
      const result = await this.statsService.getIndexStats(
        patterns,
        bucket.esUrl,
      );
      if (!result.reachable) {
        resolved.set(key, null);
        continue;
      }
      const byPattern = new Map<string, IndexStats>();
      for (const stat of result.stats) {
        // First entry wins when ES returns multiple concrete indices for a
        // pattern; the per-component endpoint also takes the first row.
        if (!byPattern.has(stat.pattern)) {
          byPattern.set(stat.pattern, stat);
        }
      }
      resolved.set(key, byPattern);
    }

    // Map back to the response shape, preserving group/record ordering.
    return groups.map((group) => ({
      componentId: group.component.id,
      componentName: group.component.name,
      indices: group.records.map((record) => {
        const key = urlKey(record.esUrl);
        const bucket = resolved.get(key);
        if (!bucket) {
          return {
            indexId: record.id,
            indexPattern: record.indexPattern,
            esUrl: record.esUrl,
            reachable: false,
          };
        }
        const stat = bucket.get(record.indexPattern);
        return {
          indexId: record.id,
          indexPattern: record.indexPattern,
          esUrl: record.esUrl,
          reachable: true,
          stats: stat,
        };
      }),
    }));
  }
}
