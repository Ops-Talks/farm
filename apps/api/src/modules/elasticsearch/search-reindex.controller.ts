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
  ApiHeader,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { SearchIndexService } from "./search-index.service";

/**
 * Controller exposing the admin-only reindex endpoint for the Elasticsearch
 * farm-search index.
 */
@ApiTags("Search")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
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
  @RequiresPermission(Permission.ORG_MANAGE)
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
  @ApiResponse({
    status: 403,
    description: "Forbidden — ORG_MANAGE permission required.",
  })
  async reindex(
    @Req() req: RequestWithOrg,
  ): Promise<{ message: string; indexed: number }> {
    const { indexed } = await this.searchIndexService.reindexAll(
      req.organizationId,
    );

    return { message: "Reindex started", indexed };
  }
}
