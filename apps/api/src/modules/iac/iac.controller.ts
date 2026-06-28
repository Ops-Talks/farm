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
  Req,
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
  ApiSecurity,
  ApiHeader,
} from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { IacService } from "./iac.service";
import { IacResourceService } from "./iac-resource.service";
import { IngestRunDto } from "./dto/ingest-run.dto";
import { ImportStacksDto } from "./dto/import-stacks.dto";
import { IngestModuleDriftDto } from "./dto/ingest-module-drift.dto";
import { IngestResourcesDto } from "./dto/ingest-resources.dto";
import { ResourceMapDto } from "./dto/resource-map.dto";
import { DashboardDto } from "./dto/dashboard.dto";
import { StackListQueryDto } from "./dto/stack-list-query.dto";
import { StackDetailDto } from "./dto/stack-detail.dto";
import { IacRun } from "./entities/iac-run.entity";
import { IacModuleDrift } from "./entities/iac-module-drift.entity";
import { Public } from "../../common/decorators/public.decorator";

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
@OrgRequired()
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
export class IacController {
  constructor(
    private readonly iacService: IacService,
    private readonly iacResourceService: IacResourceService,
  ) {}

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
  @Public()
  @Post("runs/ingest")
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 1000, limit: 3 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity("IacIngestToken")
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
    @Headers("x-organization-id") organizationId: string | undefined,
    @Body() dto: IngestRunDto,
  ): Promise<IacRun> {
    return this.iacService.ingestRun(
      dto,
      extractBearer(authorization),
      organizationId,
    );
  }

  /**
   * Bulk-imports IaC stack definitions from a Cultivator discovery run.
   * Authenticated via static IAC_INGEST_TOKEN bearer token.
   *
   * @param authorization - Authorization header containing the static bearer token
   * @param dto - Stack list payload
   * @returns Created and updated record counts
   */
  @Public()
  @Post("stacks/import")
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 1000, limit: 2 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity("IacIngestToken")
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
    @Headers("x-organization-id") organizationId: string | undefined,
    @Body() dto: ImportStacksDto,
  ): Promise<{ created: number; updated: number }> {
    return this.iacService.importStacks(
      dto,
      extractBearer(authorization),
      organizationId,
    );
  }

  /**
   * Ingests module drift data from an Agronomist scan.
   * Authenticated via static IAC_INGEST_TOKEN bearer token.
   *
   * @param authorization - Authorization header containing the static bearer token
   * @param dto - Module drift payload
   */
  @Public()
  @Post("module-drift/ingest")
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 1000, limit: 3 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity("IacIngestToken")
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
   * Returns all IaC stacks, optionally filtered by environment and/or
   * linked component ID. Each record includes the most recent run summary.
   *
   * @param query - Optional environment and componentId filters
   * @returns Array of StackDetailDto
   */
  @Get("stacks")
  @UseGuards(OrgRequiredGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "X-Organization-Id",
    required: true,
    description:
      "Organization context — all resources are scoped to this organization.",
  })
  @ApiOperation({ summary: "List IaC stacks with optional filters" })
  @ApiQuery({ name: "environment", required: false, type: String })
  @ApiQuery({ name: "componentId", required: false, type: String })
  @ApiOkResponse({
    description: "Successfully retrieved stack list.",
    type: [StackDetailDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
    type: ErrorResponseDto,
  })
  async listStacks(
    @Query() query: StackListQueryDto,
    @Req() req: RequestWithOrg,
  ): Promise<StackDetailDto[]> {
    return this.iacService.listStacks(query, req.organizationId);
  }

  /**
   * Returns a single IaC stack by UUID with its most recent run summary.
   *
   * @param id - IacStack UUID
   * @returns StackDetailDto
   */
  @Get("stacks/:id")
  @UseGuards(OrgRequiredGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "X-Organization-Id",
    required: true,
    description:
      "Organization context — all resources are scoped to this organization.",
  })
  @ApiOperation({ summary: "Get an IaC stack by ID" })
  @ApiParam({ name: "id", description: "IacStack UUID" })
  @ApiOkResponse({
    description: "Successfully retrieved stack.",
    type: StackDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "IacStack not found.",
    type: ErrorResponseDto,
  })
  async getStack(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<StackDetailDto> {
    return this.iacService.getStack(id, req.organizationId);
  }

  /**
   * Returns paginated run history for a specific IaC stack.
   *
   * @param id - IacStack UUID
   * @param page - 1-based page number (default: 1)
   * @param limit - Page size (default: 20)
   * @returns Paginated run list with total count
   */
  @Get("stacks/:id/runs")
  @UseGuards(OrgRequiredGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "X-Organization-Id",
    required: true,
    description:
      "Organization context — all resources are scoped to this organization.",
  })
  @ApiOperation({ summary: "List runs for an IaC stack" })
  @ApiParam({ name: "id", description: "IacStack UUID" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiOkResponse({
    description: "Successfully retrieved run list.",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
    type: ErrorResponseDto,
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
  @UseGuards(OrgRequiredGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "X-Organization-Id",
    required: true,
    description:
      "Organization context — all resources are scoped to this organization.",
  })
  @ApiOperation({ summary: "Get IaC dashboard summary" })
  @ApiOkResponse({
    description: "Successfully retrieved dashboard data.",
    type: DashboardDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
    type: ErrorResponseDto,
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
  @UseGuards(OrgRequiredGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "X-Organization-Id",
    required: true,
    description:
      "Organization context — all resources are scoped to this organization.",
  })
  @ApiOperation({ summary: "Get module drift records" })
  @ApiOkResponse({
    description: "Successfully retrieved module drift data.",
    type: [IacModuleDrift],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
    type: ErrorResponseDto,
  })
  async getModuleDrift(): Promise<IacModuleDrift[]> {
    return this.iacService.getModuleDrift();
  }

  /**
   * Atomically replaces the full resource topology for a stack.
   * Authenticated via static IAC_INGEST_TOKEN bearer token.
   *
   * @param id - IacStack UUID
   * @param authorization - Authorization header containing the static bearer token
   * @param dto - Resource topology payload
   */
  @Post("stacks/:id/resources/ingest")
  @SkipThrottle({ long: true })
  @Throttle({ short: { ttl: 1000, limit: 3 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity("IacIngestToken")
  @ApiOperation({
    summary: "Ingest resource topology for a stack (machine-to-machine)",
    description:
      "Atomically replaces the full resource topology for the given stack. " +
      "Authenticated via static IAC_INGEST_TOKEN bearer token.",
  })
  @ApiParam({ name: "id", description: "IacStack UUID" })
  @ApiCreatedResponse({
    description: "Resource topology ingested successfully.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid or missing IAC_INGEST_TOKEN.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "IacStack not found.",
    type: ErrorResponseDto,
  })
  async ingestResources(
    @Param("id") id: string,
    @Headers("authorization") authorization: string | undefined,
    @Body() dto: IngestResourcesDto,
  ): Promise<void> {
    return this.iacResourceService.ingestResources(
      id,
      dto,
      extractBearer(authorization),
    );
  }

  /**
   * Returns the resource topology (nodes and edges) for a stack.
   *
   * @param id - IacStack UUID
   * @returns ResourceMapDto
   */
  @Get("stacks/:id/resources")
  @UseGuards(OrgRequiredGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: "X-Organization-Id",
    required: true,
    description:
      "Organization context — all resources are scoped to this organization.",
  })
  @ApiOperation({ summary: "Get resource topology for a stack" })
  @ApiParam({ name: "id", description: "IacStack UUID" })
  @ApiOkResponse({
    description: "Successfully retrieved resource topology.",
    type: ResourceMapDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "IacStack not found.",
    type: ErrorResponseDto,
  })
  async getResources(@Param("id") id: string): Promise<ResourceMapDto> {
    return this.iacResourceService.getResources(id);
  }
}
