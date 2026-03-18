import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Req,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { PipelinesService } from "./pipelines.service";
import { CreatePipelineDto } from "./dto/create-pipeline.dto";
import { UpdatePipelineDto } from "./dto/update-pipeline.dto";
import { TriggerPipelineDto } from "./dto/trigger-pipeline.dto";
import { ListPipelinesQueryDto } from "./dto/list-pipelines-query.dto";
import { ListRunsQueryDto } from "./dto/list-runs-query.dto";
import { Pipeline } from "./entities/pipeline.entity";
import { PipelineRun } from "./entities/pipeline-run.entity";

/**
 * Controller exposing REST endpoints for pipeline definition management,
 * run triggering, and run history retrieval.
 */
@ApiTags("Pipelines")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller("pipelines")
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  /**
   * Creates a new pipeline definition.
   * @param dto - Pipeline creation payload
   * @param req - Incoming HTTP request (used to extract the authenticated user)
   * @returns The created pipeline
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new pipeline" })
  @ApiCreatedResponse({
    description: "Pipeline successfully created.",
    type: Pipeline,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "A pipeline with this name already exists.",
    type: ErrorResponseDto,
  })
  async create(
    @Body() dto: CreatePipelineDto,
    @Req() req: RequestWithOrg,
  ): Promise<Pipeline> {
    return this.pipelinesService.create(dto, req.user?.userId ?? "anonymous");
  }

  /**
   * Returns a paginated list of pipelines, optionally filtered by organization.
   * @param query - Pagination and filter parameters
   * @returns Paginated pipeline list
   */
  @Get()
  @ApiOperation({ summary: "List all pipelines" })
  @ApiOkResponse({
    description: "Successfully retrieved pipeline list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() query: ListPipelinesQueryDto,
  ): Promise<PaginatedResponseDto<Pipeline>> {
    const [data, total] = await this.pipelinesService.findAll(
      query.skip,
      query.take,
      query.organizationId,
    );
    return new PaginatedResponseDto(
      data,
      total,
      query.skip ?? 0,
      query.take ?? 20,
    );
  }

  /**
   * Returns a single pipeline by ID.
   * @param id - Pipeline UUID
   * @returns The pipeline
   */
  @Get(":id")
  @ApiOperation({ summary: "Get pipeline by ID" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiOkResponse({ description: "Pipeline found.", type: Pipeline })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pipeline not found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<Pipeline> {
    return this.pipelinesService.findOne(id);
  }

  /**
   * Updates an existing pipeline definition.
   * @param id - Pipeline UUID
   * @param dto - Fields to update
   * @returns The updated pipeline
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update a pipeline" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiOkResponse({
    description: "Pipeline successfully updated.",
    type: Pipeline,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pipeline not found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "A pipeline with this name already exists.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePipelineDto,
  ): Promise<Pipeline> {
    return this.pipelinesService.update(id, dto);
  }

  /**
   * Removes a pipeline and all associated runs.
   * @param id - Pipeline UUID
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a pipeline" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiNoContentResponse({ description: "Pipeline successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pipeline not found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    return this.pipelinesService.remove(id);
  }

  /**
   * Triggers a new pipeline execution run.
   * @param id - Pipeline UUID
   * @param _dto - Optional trigger overrides (reserved for future use)
   * @param req - Incoming HTTP request (used to extract the authenticated user)
   * @returns The newly queued PipelineRun
   */
  @Post(":id/trigger")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Trigger a pipeline run" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiCreatedResponse({
    description: "Pipeline run queued successfully.",
    type: PipelineRun,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pipeline not found.",
    type: ErrorResponseDto,
  })
  async trigger(
    @Param("id") id: string,
    @Body() _dto: TriggerPipelineDto,
    @Req() req: RequestWithOrg,
  ): Promise<PipelineRun> {
    return this.pipelinesService.triggerRun(
      id,
      req.user?.userId ?? "anonymous",
    );
  }

  /**
   * Returns a paginated list of runs for a pipeline, ordered newest first.
   * Supports optional status filtering.
   *
   * @param id - Pipeline UUID
   * @param query - Pagination and status filter parameters
   * @returns Paginated run list with metadata
   */
  @Get(":id/runs")
  @ApiOperation({ summary: "List runs for a pipeline" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiOkResponse({
    description: "Successfully retrieved run list.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pipeline not found.",
    type: ErrorResponseDto,
  })
  async findRuns(
    @Param("id") id: string,
    @Query() query: ListRunsQueryDto,
  ): Promise<{
    data: PipelineRun[];
    total: number;
    skip: number;
    take: number;
  }> {
    const [data, total] = await this.pipelinesService.findRuns(id, query);
    return { data, total, skip: query.skip ?? 0, take: query.take ?? 20 };
  }

  /**
   * Returns aggregate statistics for all runs of a pipeline.
   *
   * @param id - Pipeline UUID
   * @returns Stats including totals, per-status counts, success rate,
   *   average duration of succeeded runs, and last run timestamp
   */
  @Get(":id/runs/stats")
  @ApiOperation({ summary: "Get run statistics for a pipeline" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiOkResponse({
    description: "Successfully retrieved run statistics.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Pipeline not found.",
    type: ErrorResponseDto,
  })
  async getRunStats(@Param("id") id: string) {
    return this.pipelinesService.getRunStats(id);
  }

  /**
   * Compares two pipeline runs side-by-side, including a per-stage diff.
   *
   * @param id - Pipeline UUID
   * @param runIdA - UUID of the baseline run (query param "a")
   * @param runIdB - UUID of the comparison run (query param "b")
   * @returns Snapshots of both runs and a list of per-stage diff entries
   */
  @Get(":id/runs/compare")
  @ApiOperation({ summary: "Compare two pipeline runs" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiQuery({
    name: "a",
    description: "UUID of the baseline run",
    required: true,
  })
  @ApiQuery({
    name: "b",
    description: "UUID of the comparison run",
    required: true,
  })
  @ApiOkResponse({
    description: "Successfully compared the two runs.",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Query params "a" and "b" are required.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "One or both runs not found.",
    type: ErrorResponseDto,
  })
  async compareRuns(
    @Param("id") id: string,
    @Query("a") runIdA: string,
    @Query("b") runIdB: string,
  ) {
    if (!runIdA || !runIdB) {
      throw new BadRequestException('Query params "a" and "b" are required');
    }
    return this.pipelinesService.compareRuns(id, runIdA, runIdB);
  }

  /**
   * Returns a specific run belonging to a pipeline.
   * @param id - Pipeline UUID
   * @param runId - PipelineRun UUID
   * @returns The matching PipelineRun
   */
  @Get(":id/runs/:runId")
  @ApiOperation({ summary: "Get a specific pipeline run" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiParam({ name: "runId", description: "PipelineRun UUID" })
  @ApiOkResponse({ description: "Run found.", type: PipelineRun })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Run not found.",
    type: ErrorResponseDto,
  })
  async findRun(
    @Param("id") id: string,
    @Param("runId") runId: string,
  ): Promise<PipelineRun> {
    return this.pipelinesService.findRun(id, runId);
  }

  /**
   * Approves a run that is waiting for manual approval and resumes execution
   * from the stage immediately after the approval gate.
   *
   * @param id - Pipeline UUID
   * @param runId - PipelineRun UUID
   * @param req - Incoming HTTP request (used to extract the authenticated user)
   * @returns The updated PipelineRun
   */
  @Post(":id/runs/:runId/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Approve a pipeline run waiting for approval" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiParam({ name: "runId", description: "PipelineRun UUID" })
  @ApiOkResponse({
    description: "Run approved and resumed.",
    type: PipelineRun,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Run is not waiting for approval.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Run not found.",
    type: ErrorResponseDto,
  })
  async approveRun(
    @Param("id") id: string,
    @Param("runId") runId: string,
    @Req() req: RequestWithOrg,
  ): Promise<PipelineRun> {
    return this.pipelinesService.approveRun(
      id,
      runId,
      req.user?.userId ?? "anonymous",
    );
  }

  /**
   * Rejects a run that is waiting for manual approval, marking it as failed.
   *
   * @param id - Pipeline UUID
   * @param runId - PipelineRun UUID
   * @param req - Incoming HTTP request (used to extract the authenticated user)
   * @returns The updated PipelineRun
   */
  @Post(":id/runs/:runId/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reject a pipeline run waiting for approval" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiParam({ name: "runId", description: "PipelineRun UUID" })
  @ApiOkResponse({
    description: "Run rejected and marked as failed.",
    type: PipelineRun,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Run is not waiting for approval.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Run not found.",
    type: ErrorResponseDto,
  })
  async rejectRun(
    @Param("id") id: string,
    @Param("runId") runId: string,
    @Req() req: RequestWithOrg,
  ): Promise<PipelineRun> {
    return this.pipelinesService.rejectRun(
      id,
      runId,
      req.user?.userId ?? "anonymous",
    );
  }

  /**
   * Cancels a QUEUED, RUNNING, or WAITING_APPROVAL run.
   *
   * @param id - Pipeline UUID
   * @param runId - PipelineRun UUID
   * @param req - Incoming HTTP request (used to extract the authenticated user)
   * @returns The updated PipelineRun
   */
  @Post(":id/runs/:runId/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancel a pipeline run" })
  @ApiParam({ name: "id", description: "Pipeline UUID" })
  @ApiParam({ name: "runId", description: "PipelineRun UUID" })
  @ApiOkResponse({
    description: "Run cancelled.",
    type: PipelineRun,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Run cannot be cancelled.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Run not found.",
    type: ErrorResponseDto,
  })
  async cancelRun(
    @Param("id") id: string,
    @Param("runId") runId: string,
    @Req() req: RequestWithOrg,
  ): Promise<PipelineRun> {
    return this.pipelinesService.cancelRun(
      id,
      runId,
      req.user?.userId ?? "anonymous",
    );
  }
}
