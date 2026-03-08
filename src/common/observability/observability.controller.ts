import { Controller, Get, HttpStatus, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { ObservabilityService } from "./observability.service";
import { ObservabilitySummaryDto } from "./dto/observability-summary.dto";

/**
 * Controller for application observability data.
 * Provides metrics summary, health, and tooling links.
 */
@ApiTags("Observability")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("observability")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden - Insufficient role.",
  type: ErrorResponseDto,
})
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  /** Aggregated metrics summary for the observability dashboard. */
  @Get("summary")
  @Roles("admin")
  @ApiOperation({
    summary: "Get observability metrics summary",
    description:
      "Returns process uptime, memory usage, HTTP request counts by status, latency percentiles, and external tool links.",
  })
  @ApiOkResponse({
    description: "Metrics summary retrieved.",
    type: ObservabilitySummaryDto,
  })
  async getSummary(): Promise<ObservabilitySummaryDto> {
    return this.observabilityService.getSummary();
  }
}
