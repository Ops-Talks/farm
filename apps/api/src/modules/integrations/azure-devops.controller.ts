import { Controller, Get, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { AzureDevOpsService } from "./azure-devops.service";

/**
 * Controller exposing Azure DevOps pipeline endpoints.
 */
@ApiTags("Integrations")
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: "Unauthorized — missing or invalid JWT.",
})
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
