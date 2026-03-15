import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiOkResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import { ErrorResponseDto } from "../dto/error-response.dto";
import { QueuesService } from "./queues.service";
import { QueueInfoDto, JobInfoDto } from "./dto/queue-info.dto";

/**
 * Controller for BullMQ queue monitoring and job management.
 * Provides REST endpoints to inspect queue status, list jobs, and retry failures.
 */
@ApiTags("Queues")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("queues")
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
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  /** List all registered BullMQ queues with job counts. */
  @Get()
  @Roles("admin")
  @ApiOperation({ summary: "List all queues with job counts" })
  @ApiOkResponse({ description: "Queue list retrieved.", type: [QueueInfoDto] })
  async listQueues(): Promise<QueueInfoDto[]> {
    return this.queuesService.listQueues();
  }

  /** Get detailed stats for a single queue. */
  @Get(":name")
  @Roles("admin")
  @ApiOperation({ summary: "Get queue info by name" })
  @ApiParam({ name: "name", description: "Queue name" })
  @ApiOkResponse({ description: "Queue info retrieved.", type: QueueInfoDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Queue not found.",
  })
  async getQueue(@Param("name") name: string): Promise<QueueInfoDto> {
    return this.queuesService.getQueueInfo(name);
  }

  /** List jobs in a queue, optionally filtered by status. */
  @Get(":name/jobs")
  @Roles("admin")
  @ApiOperation({ summary: "List jobs in a queue" })
  @ApiParam({ name: "name", description: "Queue name" })
  @ApiQuery({
    name: "status",
    required: false,
    description:
      "Filter by job status (active, completed, failed, delayed, waiting)",
  })
  @ApiQuery({
    name: "start",
    required: false,
    type: Number,
    description: "Offset for pagination (default 0)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Max results to return (default 20)",
  })
  @ApiOkResponse({ description: "Job list retrieved.", type: [JobInfoDto] })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Queue not found.",
  })
  async listJobs(
    @Param("name") name: string,
    @Query("status") status?: string,
    @Query("start") start?: string,
    @Query("limit") limit?: string,
  ): Promise<JobInfoDto[]> {
    return this.queuesService.listJobs(
      name,
      status,
      start ? parseInt(start, 10) : 0,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /** Get details for a single job. */
  @Get(":name/jobs/:jobId")
  @Roles("admin")
  @ApiOperation({ summary: "Get job detail" })
  @ApiParam({ name: "name", description: "Queue name" })
  @ApiParam({ name: "jobId", description: "Job ID" })
  @ApiOkResponse({ description: "Job detail retrieved.", type: JobInfoDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Job or queue not found.",
  })
  async getJob(
    @Param("name") name: string,
    @Param("jobId") jobId: string,
  ): Promise<JobInfoDto> {
    return this.queuesService.getJob(name, jobId);
  }

  /** Retry a failed job. */
  @Post(":name/jobs/:jobId/retry")
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Retry a failed job" })
  @ApiParam({ name: "name", description: "Queue name" })
  @ApiParam({ name: "jobId", description: "Job ID" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Job retry initiated.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Job or queue not found, or job is not in failed state.",
  })
  async retryJob(
    @Param("name") name: string,
    @Param("jobId") jobId: string,
  ): Promise<void> {
    return this.queuesService.retryJob(name, jobId);
  }
}
