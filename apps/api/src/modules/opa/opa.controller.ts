import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OpaService } from "./opa.service";
import { EvaluateOpaDto } from "./dto/evaluate-opa.dto";
import { OpaResultResponseDto } from "./dto/opa-result-response.dto";
import { OpaStatusResponseDto } from "./dto/opa-status-response.dto";

/**
 * Controller for Open Policy Agent (OPA) integration endpoints.
 * Provides health status, on-demand policy evaluation, and result history.
 */
@ApiTags("OPA")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized — missing or invalid JWT.",
})
@Controller("opa")
export class OpaController {
  constructor(private readonly opaService: OpaService) {}

  /**
   * Returns whether the configured OPA server is reachable.
   *
   * @returns OPA status with reachable flag and server URL
   */
  @Get("status")
  @ApiOperation({ summary: "Check OPA server reachability" })
  @ApiOkResponse({
    description: "Returns OPA server status.",
    type: OpaStatusResponseDto,
  })
  async getStatus(): Promise<OpaStatusResponseDto> {
    const reachable = await this.opaService.isReachable();
    return { reachable, url: this.opaService.getOpaUrl() };
  }

  /**
   * Evaluates an OPA policy with the provided input document.
   * When a componentId is included in the body, the result is persisted.
   *
   * @param dto - Policy path, input document, and optional component ID
   * @returns Evaluation result with policy path, allowed flag, and violations
   */
  @Post("evaluate")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Evaluate an OPA policy" })
  @ApiCreatedResponse({
    description: "Returns the policy evaluation result.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Unauthorized - Authentication token is missing or invalid.",
  })
  async evaluate(
    @Body() dto: EvaluateOpaDto,
  ): Promise<{ policyPath: string; allowed: boolean; violations: string[] }> {
    const result = await this.opaService.evaluate(dto.policyPath, dto.input);

    if (dto.componentId) {
      await this.opaService.saveResult(dto.componentId, dto.policyPath, result);
    }

    return { policyPath: dto.policyPath, ...result };
  }

  /**
   * Returns all stored OPA evaluation results for the given component.
   *
   * @param componentId - Catalog component UUID to query results for
   * @returns Array of OpaResult entities
   */
  @Get("results/:componentId")
  @ApiOperation({ summary: "List OPA evaluation results for a component" })
  @ApiParam({ name: "componentId", description: "Catalog component UUID" })
  @ApiOkResponse({
    description: "Returns stored OPA evaluation results.",
    type: [OpaResultResponseDto],
  })
  async listResults(
    @Param("componentId") componentId: string,
  ): Promise<OpaResultResponseDto[]> {
    const entities = await this.opaService.listResults(componentId);
    return entities.map((entity) => OpaResultResponseDto.fromEntity(entity));
  }
}
