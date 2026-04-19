import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { SearchService, QuickSearchResult } from "./search.service";
import { AdvancedSearchQueryDto } from "./dto/advanced-search-query.dto";
import type { AdvancedSearchResult } from "./interfaces/advanced-search-result.interface";

/**
 * Controller exposing quick search and advanced faceted search
 * across catalog entities.
 */
@ApiTags("search")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("quick")
  @ApiOperation({
    summary:
      "Quick search across catalog, teams, docs, environments, and pipelines",
  })
  @ApiQuery({
    name: "q",
    description: "Search term (minimum 2 characters)",
    required: true,
  })
  @ApiQuery({
    name: "limit",
    description: "Maximum results to return (default 10, max 100)",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Array of matching results grouped by entity type",
  })
  async quickSearch(
    @Query("q") q: string,
    @Query("limit") limit?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<QuickSearchResult[]> {
    const parsed = limit ? parseInt(limit, 10) : 10;
    const safeLimit = Number.isNaN(parsed)
      ? 10
      : Math.min(Math.max(parsed, 1), 100);
    return this.searchService.quickSearch(
      q ?? "",
      safeLimit,
      req?.organizationId,
    );
  }

  @Get("advanced")
  @ApiOperation({
    summary: "Advanced search with facets, boost weights, and typo tolerance",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated advanced search results with facet aggregations",
  })
  async advancedSearch(
    @Query() dto: AdvancedSearchQueryDto,
    @Req() req?: RequestWithOrg,
  ): Promise<AdvancedSearchResult> {
    return this.searchService.advancedSearch(dto, req?.organizationId);
  }
}
