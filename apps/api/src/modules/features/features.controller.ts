import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { FeaturesService, FeatureAvailabilityMap } from "./features.service";

/**
 * Controller exposing the bulk feature availability endpoint.
 */
@ApiTags("Features")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiResponse({
  status: 401,
  description: "Unauthorized — missing or invalid JWT.",
})
@Controller("features")
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get("availability")
  @ApiOperation({
    summary: "Get availability status for all optional platform features",
  })
  @ApiResponse({ status: 200, description: "Feature availability map" })
  async getAvailability(): Promise<FeatureAvailabilityMap> {
    return this.featuresService.getAvailability();
  }
}
