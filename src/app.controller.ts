import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";

@ApiTags("Health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  @ApiOperation({ summary: "Check API health status" })
  @ApiResponse({
    status: 200,
    description: "The API is healthy.",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        version: { type: "string", example: "0.2.2" },
      },
    },
  })
  getHealth(): { status: string; version: string } {
    return this.appService.getHealth();
  }
}
