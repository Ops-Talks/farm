import {
  Controller,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { SearchIndexService } from "./search-index.service";

/**
 * Controller exposing the admin-only reindex endpoint for the Elasticsearch
 * farm-search index.
 */
@ApiTags("search")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("search")
export class SearchReindexController {
  constructor(private readonly searchIndexService: SearchIndexService) {}

  /**
   * Triggers a full reindex of all catalog entities into Elasticsearch.
   * Scoped to the organization derived from the request context when available.
   *
   * Only users with the "admin" role may invoke this endpoint.
   */
  @Post("reindex")
  @Roles("admin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reindex all catalog entities into Elasticsearch",
    description:
      "Fetches all Component, Team, Documentation, Environment, and Pipeline " +
      "entities and bulk-indexes them into the farm-search Elasticsearch index. " +
      "When an X-Organization-Id header is present the reindex is scoped to that " +
      "organization only. Requires admin role.",
  })
  @ApiResponse({
    status: 200,
    description: "Reindex completed successfully.",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Reindex started" },
        indexed: { type: "number", example: 42 },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized." })
  @ApiResponse({ status: 403, description: "Forbidden — admin role required." })
  async reindex(
    @Req() req: RequestWithOrg,
  ): Promise<{ message: string; indexed: number }> {
    const { indexed } = await this.searchIndexService.reindexAll(
      req.organizationId,
    );

    return { message: "Reindex started", indexed };
  }
}
