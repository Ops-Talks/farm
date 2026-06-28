import { Controller, Get, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { GitHubActionsService } from "./github-actions.service";

/**
 * Controller exposing GitHub Actions workflow run endpoints.
 */
@ApiTags("Integrations")
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: "Unauthorized — missing or invalid JWT.",
})
@Controller("integrations/github-actions")
export class GitHubActionsController {
  constructor(private readonly service: GitHubActionsService) {}

  @Get("runs")
  @ApiOperation({ summary: "List recent GitHub Actions workflow runs" })
  async listRuns(@Req() req: RequestWithOrg) {
    const orgId = req.organizationId ?? "";
    return this.service.listWorkflowRuns(orgId);
  }
}
