import { Controller, Get, Post, Param, UseGuards, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { SetupService, SetupChecklistItem } from "./setup.service";

/**
 * Controller exposing the admin setup checklist endpoints.
 */
@ApiTags("setup")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("setup")
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get("checklist")
  @ApiOperation({
    summary: "Get the admin setup checklist with completion status",
  })
  @ApiResponse({ status: 200, description: "Array of checklist items" })
  async getChecklist(@Req() req: Request): Promise<SetupChecklistItem[]> {
    const orgId = (req as unknown as { organizationId?: string })
      .organizationId;
    return this.setupService.getChecklist(orgId);
  }

  @Post("checklist/:key/dismiss")
  @ApiOperation({
    summary: "Dismiss a checklist item for the current organization",
  })
  @ApiParam({ name: "key", description: "Checklist item key" })
  @ApiResponse({ status: 200, description: "Item dismissed" })
  async dismissItem(
    @Param("key") key: string,
    @Req() req: Request,
  ): Promise<{ dismissed: boolean }> {
    const orgId = (req as unknown as { organizationId?: string })
      .organizationId;
    await this.setupService.dismissItem(orgId, key);
    return { dismissed: true };
  }
}
