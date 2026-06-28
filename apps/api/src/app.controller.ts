import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Public } from "./common/decorators/public.decorator";
import { AppService } from "./app.service";

@Public()
@ApiTags("Health")
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: "Root health check",
    description:
      "Returns a simple status string confirming the API is running.",
  })
  @ApiResponse({ status: 200, description: "API is running." })
  getHello(): string {
    return "Farm API is running. Visit /api/docs for documentation.";
  }
}
