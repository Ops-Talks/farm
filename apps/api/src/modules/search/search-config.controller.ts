import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { SearchService } from "./search.service";
import { UpdateSearchConfigDto } from "./dto/update-search-config.dto";
import type { SearchConfig } from "./entities/search-config.entity";

/**
 * Admin-only controller for reading and updating the SearchConfig that
 * controls Elasticsearch boost weights and fuzziness for a given organization.
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
@RequiresPermission(Permission.ORG_MANAGE)
@Controller("search/config")
@ApiResponse({
  status: 401,
  description: "Unauthorized — missing or invalid JWT.",
})
@ApiResponse({
  status: 403,
  description: "Forbidden — requires ORG_MANAGE permission.",
})
export class SearchConfigController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Returns the active SearchConfig for the requesting organization,
   * or null when no custom config exists (hardcoded defaults are in effect).
   */
  @Get()
  @ApiOperation({
    summary:
      "Get the search boost config for the current organization (null = defaults)",
  })
  @ApiResponse({
    status: 200,
    description: "Active search config or null if defaults are being used",
  })
  async getConfig(@Req() req?: RequestWithOrg): Promise<SearchConfig | null> {
    return this.searchService.getConfig(req?.organizationId);
  }

  /**
   * Creates or updates the SearchConfig for the requesting organization.
   * Omitted fields are left unchanged (update) or set to defaults (create).
   */
  @Patch()
  @ApiOperation({
    summary: "Upsert search boost config for the current organization",
  })
  @ApiResponse({
    status: 200,
    description: "The saved search config",
  })
  async upsertConfig(
    @Body() dto: UpdateSearchConfigDto,
    @Req() req?: RequestWithOrg,
  ): Promise<SearchConfig> {
    return this.searchService.upsertConfig(dto, req?.organizationId);
  }
}
