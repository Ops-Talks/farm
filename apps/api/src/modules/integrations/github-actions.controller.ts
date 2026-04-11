import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { GitHubActionsService } from "./github-actions.service";

/**
 * Controller exposing GitHub Actions workflow run endpoints.
 */
@ApiTags("integrations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
