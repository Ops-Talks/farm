import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ScorecardLevel } from "./entities/scorecard-result.entity";
import { ScorecardsService } from "./scorecards.service";
import {
  ScorecardOverviewDto,
  ScorecardResultDto,
} from "./dto/scorecard-result.dto";

/**
 * REST controller for the scorecards module.
 *
 * All routes are protected with JWT authentication.
 * The global /api prefix is applied in main.ts — no prefix is added here.
 */
@ApiTags("Scorecards")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized — missing or invalid JWT.",
})
@Controller("scorecards")
export class ScorecardsController {
  constructor(private readonly scorecardsService: ScorecardsService) {}

  /**
   * Returns all scorecard results, optionally filtered by organization, level,
   * component kind, or owning team. Results include component metadata.
   */
  @Get()
  @ApiOperation({ summary: "List all scorecard results" })
  @ApiQuery({
    name: "level",
    required: false,
    enum: ScorecardLevel,
    description: "Filter results by maturity level",
  })
  @ApiQuery({
    name: "kind",
    required: false,
    description: "Filter results by component kind",
  })
  @ApiQuery({
    name: "teamId",
    required: false,
    description: "Filter results by owning team UUID",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of scorecard results with component metadata.",
    type: [ScorecardResultDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Authentication token is missing or invalid.",
  })
  async findAll(
    @Req() req: RequestWithOrg,
    @Query("level") level?: ScorecardLevel,
    @Query("kind") kind?: string,
    @Query("teamId") teamId?: string,
  ): Promise<ScorecardResultDto[]> {
    const results = await this.scorecardsService.findAll({
      organizationId: req.organizationId,
      level,
      kind,
      teamId,
    });

    return results.map((r) => ({
      id: r.id,
      componentId: r.componentId,
      overallScore: Number(r.overallScore),
      level: r.level,
      categoryScores: r.categoryScores ?? null,
      criteria: r.criteria ?? null,
      evaluatedAt: r.evaluatedAt ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      componentName: r.componentName,
      componentKind: r.componentKind,
      componentLifecycle: r.componentLifecycle,
      teamId: r.teamId ?? null,
    }));
  }

  /**
   * Returns an aggregated health overview of all scorecards, including level
   * distribution and per-team averages.
   */
  @Get("overview")
  @ApiOperation({ summary: "Get aggregated scorecard overview" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Aggregated scorecard overview.",
    type: ScorecardOverviewDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Authentication token is missing or invalid.",
  })
  async getOverview(@Req() req: RequestWithOrg): Promise<ScorecardOverviewDto> {
    const data = await this.scorecardsService.getOverview(req.organizationId);

    return {
      totalComponents: data.totalComponents,
      averageScore: data.averageScore,
      levelDistribution: data.levelDistribution,
      byTeam: data.byTeam,
    };
  }

  /**
   * Returns the latest scorecard result for the specified component.
   * Responds with HTTP 404 when no result has been recorded yet.
   *
   * @param componentId - UUID of the component to look up.
   */
  @Get("components/:componentId")
  @ApiOperation({ summary: "Get the scorecard result for a component" })
  @ApiParam({
    name: "componentId",
    description: "UUID of the component",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Scorecard result for the component.",
    type: ScorecardResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "No scorecard result found for the given component.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Authentication token is missing or invalid.",
  })
  async findByComponent(
    @Req() req: RequestWithOrg,
    @Param("componentId") componentId: string,
  ): Promise<ScorecardResultDto> {
    const result = await this.scorecardsService.findByComponent(
      componentId,
      req.organizationId,
    );

    if (!result) {
      throw new NotFoundException(
        `No scorecard result found for component ${componentId}`,
      );
    }

    return {
      id: result.id,
      componentId: result.componentId,
      overallScore: Number(result.overallScore),
      level: result.level,
      categoryScores: result.categoryScores ?? null,
      criteria: result.criteria ?? null,
      evaluatedAt: result.evaluatedAt ?? null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Triggers a fresh evaluation for the specified component and persists the
   * result. Returns the updated scorecard result.
   *
   * @param componentId - UUID of the component to re-evaluate.
   * @param dto - Optional organization scoping for the evaluation.
   */
  @Post("components/:componentId/refresh")
  @ApiOperation({
    summary: "Trigger a scorecard re-evaluation for a component",
  })
  @ApiParam({
    name: "componentId",
    description: "UUID of the component to re-evaluate",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Updated scorecard result after re-evaluation.",
    type: ScorecardResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Component not found.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Authentication token is missing or invalid.",
  })
  async refresh(
    @Req() req: RequestWithOrg,
    @Param("componentId") componentId: string,
  ): Promise<ScorecardResultDto> {
    const result = await this.scorecardsService.evaluateAndSave(
      componentId,
      req.organizationId,
    );

    return {
      id: result.id,
      componentId: result.componentId,
      overallScore: Number(result.overallScore),
      level: result.level,
      categoryScores: result.categoryScores ?? null,
      criteria: result.criteria ?? null,
      evaluatedAt: result.evaluatedAt ?? null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
}
