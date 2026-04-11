import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { AzureDevOpsService } from "./azure-devops.service";

/**
 * Controller exposing Azure DevOps pipeline endpoints.
 */
@ApiTags("integrations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("integrations/azure-devops")
export class AzureDevOpsController {
  constructor(private readonly service: AzureDevOpsService) {}

  @Get("pipelines")
  @ApiOperation({ summary: "List Azure DevOps pipelines" })
  async listPipelines(@Req() req: RequestWithOrg) {
    const orgId = req.organizationId ?? "";
    return this.service.listPipelines(orgId);
  }
}
