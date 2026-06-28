import { Controller, Get, Post, Param, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { SetupService, SetupChecklistItem } from "./setup.service";

/**
 * Controller exposing the admin setup checklist endpoints.
 */
@ApiTags("Setup")
@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: "Unauthorized — missing or invalid JWT.",
})
@Controller("setup")
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get("checklist")
  @ApiOperation({
    summary: "Get the admin setup checklist with completion status",
  })
  @ApiResponse({ status: 200, description: "Array of checklist items" })
  async getChecklist(
    @Req() req: RequestWithOrg,
  ): Promise<SetupChecklistItem[]> {
    return this.setupService.getChecklist(req.organizationId);
  }

  @Post("checklist/:key/dismiss")
  @ApiOperation({
    summary: "Dismiss a checklist item for the current organization",
  })
  @ApiParam({ name: "key", description: "Checklist item key" })
  @ApiResponse({ status: 200, description: "Item dismissed" })
  async dismissItem(
    @Param("key") key: string,
    @Req() req: RequestWithOrg,
  ): Promise<{ dismissed: boolean }> {
    await this.setupService.dismissItem(req.organizationId, key);
    return { dismissed: true };
  }
}
