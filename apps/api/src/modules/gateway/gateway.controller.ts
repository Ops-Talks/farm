import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { GatewayService } from "./gateway.service";
import { GatewayRoute } from "./entities/gateway-route.entity";
import { ApiHealthCheck } from "./entities/api-health-check.entity";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller exposing gateway route discovery and health check endpoints.
 */
@ApiTags("Gateway")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("gateway")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized — missing or invalid JWT.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden — insufficient role.",
  type: ErrorResponseDto,
})
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @ApiOperation({ summary: "List all synchronized gateway routes" })
  @ApiQuery({
    name: "componentId",
    required: false,
    description: "Filter routes by catalog component UUID",
  })
  @ApiHeader({
    name: "X-Organization-Id",
    required: false,
    description: "Filter routes by organization UUID",
  })
  @ApiOkResponse({ type: [GatewayRoute] })
  @Get("routes")
  findAllRoutes(
    @Query("componentId") componentId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<GatewayRoute[]> {
    const organizationId = req?.organizationId;
    return this.gatewayService.findAllRoutes(componentId, organizationId);
  }

  @ApiOperation({ summary: "Get a single gateway route by ID" })
  @ApiParam({ name: "id", description: "Gateway route UUID" })
  @ApiOkResponse({ type: GatewayRoute })
  @Get("routes/:id")
  findOneRoute(@Param("id") id: string): Promise<GatewayRoute> {
    return this.gatewayService.findOneRoute(id);
  }

  @ApiOperation({ summary: "Trigger a manual gateway route sync (admin only)" })
  @ApiCreatedResponse({ schema: { example: { message: "Sync triggered" } } })
  @Roles("admin")
  @HttpCode(HttpStatus.CREATED)
  @Post("sync")
  async syncRoutes(): Promise<{ message: string }> {
    await this.gatewayService.syncRoutes();
    return { message: "Sync triggered" };
  }

  @ApiOperation({ summary: "List all API health check results" })
  @ApiQuery({
    name: "apiSpecId",
    required: false,
    description: "Filter health checks by API spec UUID",
  })
  @ApiOkResponse({ type: [ApiHealthCheck] })
  @Get("health")
  findAllHealthChecks(
    @Query("apiSpecId") apiSpecId?: string,
  ): Promise<ApiHealthCheck[]> {
    return this.gatewayService.findAllHealthChecks(apiSpecId);
  }

  @ApiOperation({ summary: "Trigger a manual API health check (admin only)" })
  @ApiCreatedResponse({
    schema: { example: { message: "Health check triggered" } },
  })
  @Roles("admin")
  @HttpCode(HttpStatus.CREATED)
  @Post("health/check")
  async triggerHealthCheck(): Promise<{ message: string }> {
    await this.gatewayService.triggerHealthCheck();
    return { message: "Health check triggered" };
  }
}
