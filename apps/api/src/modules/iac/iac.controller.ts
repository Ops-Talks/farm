import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Headers,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { IacService } from "./iac.service";
import { IngestRunDto } from "./dto/ingest-run.dto";
import { ImportStacksDto } from "./dto/import-stacks.dto";
import { IngestModuleDriftDto } from "./dto/ingest-module-drift.dto";
import { DashboardDto } from "./dto/dashboard.dto";
import { IacRun } from "./entities/iac-run.entity";
import { IacModuleDrift } from "./entities/iac-module-drift.entity";

/**
 * Extracts the raw bearer token value from an Authorization header string.
 * Returns an empty string when the header is absent or malformed.
 */
function extractBearer(authHeader: string | undefined): string {
  if (!authHeader) return "";
  const parts = authHeader.split(" ");
  return parts.length === 2 && parts[0].toLowerCase() === "bearer"
    ? parts[1]
    : "";
}

/**
 * Controller exposing IaC ingest (machine-to-machine) and dashboard
 * (user-facing) endpoints.
 *
 * Ingest endpoints are NOT protected by JwtAuthGuard; they validate a static
 * bearer token (IAC_INGEST_TOKEN) inside the service.
 */
@ApiTags("IaC")
@UseInterceptors(ClassSerializerInterceptor)
@Controller("iac")
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class IacController {
  constructor(private readonly iacService: IacService) {}

  // ---------------------------------------------------------------------------
  // Machine-to-machine ingest endpoints (no JwtAuthGuard)
  // ---------------------------------------------------------------------------

  /**
   * Records a completed Terraform/OpenTofu plan or apply run.
   * Authenticated via a static IAC_INGEST_TOKEN bearer token.
   *
   * @param authorization - Authorization header containing the static bearer token
   * @param dto - Run report payload
   * @returns The persisted IacRun record
   */
  @Post("runs/ingest")
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 1000, limit: 3 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Ingest an IaC run report (machine-to-machine)",
    description:
      "Accepts a Terraform/OpenTofu run report from Cultivator or CI. " +
      "Authenticated via static IAC_INGEST_TOKEN bearer token.",
  })
  @ApiCreatedResponse({
    description: "Run ingested successfully.",
    type: IacRun,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid or missing IAC_INGEST_TOKEN.",
    type: ErrorResponseDto,
  })
  async ingestRun(
    @Headers("authorization") authorization: string | undefined,
    @Body() dto: IngestRunDto,
  ): Promise<IacRun> {
    return this.iacService.ingestRun(dto, extractBearer(authorization));
  }

  /**
   * Bulk-imports IaC stack definitions from a Cultivator discovery run.
   * Authenticated via static IAC_INGEST_TOKEN bearer token.
   *
   * @param authorization - Authorization header containing the static bearer token
   * @param dto - Stack list payload
   * @returns Created and updated record counts
   */
  @Post("stacks/import")
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 1000, limit: 2 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Bulk import IaC stacks (machine-to-machine)",
    description:
      "Upserts stack records from Cultivator discovery output. " +
      "Authenticated via static IAC_INGEST_TOKEN bearer token.",
  })
  @ApiCreatedResponse({
    description: "Stacks imported successfully.",
    schema: {
      type: "object",
      properties: {
        created: { type: "number" },
        updated: { type: "number" },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid or missing IAC_INGEST_TOKEN.",
    type: ErrorResponseDto,
  })
  async importStacks(
    @Headers("authorization") authorization: string | undefined,
    @Body() dto: ImportStacksDto,
  ): Promise<{ created: number; updated: number }> {
    return this.iacService.importStacks(dto, extractBearer(authorization));
  }

  /**
   * Ingests module drift data from an Agronomist scan.
   * Authenticated via static IAC_INGEST_TOKEN bearer token.
   *
   * @param authorization - Authorization header containing the static bearer token
   * @param dto - Module drift payload
   */
  @Post("module-drift/ingest")
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 1000, limit: 3 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Ingest module drift data (machine-to-machine)",
    description:
      "Records outdated module references detected by Agronomist. " +
      "Authenticated via static IAC_INGEST_TOKEN bearer token.",
  })
  @ApiCreatedResponse({ description: "Drift records ingested successfully." })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid or missing IAC_INGEST_TOKEN.",
    type: ErrorResponseDto,
  })
  async ingestModuleDrift(
    @Headers("authorization") authorization: string | undefined,
    @Body() dto: IngestModuleDriftDto,
  ): Promise<void> {
    return this.iacService.ingestModuleDrift(dto, extractBearer(authorization));
  }

  // ---------------------------------------------------------------------------
  // User-facing protected endpoints (JwtAuthGuard)
  // ---------------------------------------------------------------------------

  /**
   * Returns paginated run history for a specific IaC stack.
   *
   * @param id - IacStack UUID
   * @param page - 1-based page number (default: 1)
   * @param limit - Page size (default: 20)
   * @returns Paginated run list with total count
   */
  @Get("stacks/:id/runs")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List runs for an IaC stack" })
  @ApiParam({ name: "id", description: "IacStack UUID" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiOkResponse({
    description: "Successfully retrieved run list.",
  })
  async getStackRuns(
    @Param("id") id: string,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ): Promise<{ data: IacRun[]; total: number }> {
    return this.iacService.getStackRuns(
      id,
      Number(page),
      Math.min(Number(limit), 100),
    );
  }

  /**
   * Returns the IaC dashboard summary grouped by environment.
   *
   * @returns DashboardDto with per-environment stack summaries
   */
  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get IaC dashboard summary" })
  @ApiOkResponse({
    description: "Successfully retrieved dashboard data.",
    type: DashboardDto,
  })
  async getDashboard(): Promise<DashboardDto> {
    return this.iacService.getDashboard();
  }

  /**
   * Returns all module drift records ordered by detection time (newest first).
   *
   * @returns Array of IacModuleDrift records
   */
  @Get("module-drift")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get module drift records" })
  @ApiOkResponse({
    description: "Successfully retrieved module drift data.",
    type: [IacModuleDrift],
  })
  async getModuleDrift(): Promise<IacModuleDrift[]> {
    return this.iacService.getModuleDrift();
  }
}
