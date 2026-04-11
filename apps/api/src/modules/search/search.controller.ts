import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { SearchService, QuickSearchResult } from "./search.service";

/**
 * Controller exposing quick search across catalog entities.
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
    description: "Maximum results to return (default 10)",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Array of matching results grouped by entity type",
  })
  async quickSearch(
    @Query("q") q: string,
    @Query("limit") limit?: string,
  ): Promise<QuickSearchResult[]> {
    return this.searchService.quickSearch(
      q ?? "",
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
