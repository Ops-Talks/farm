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
  Req,
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
  ApiHeader,
} from "@nestjs/swagger";
import { Request } from "express";
import { IncidentService } from "./incident.service";
import { IncidentUpdateService } from "./incident-update.service";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import { UpdateIncidentDto } from "./dto/update-incident.dto";
import { UpdateIncidentStatusDto } from "./dto/update-incident-status.dto";
import { CreateIncidentUpdateDto } from "./dto/create-incident-update.dto";
import { ListIncidentsQueryDto } from "./dto/list-incidents-query.dto";
import { Incident } from "./entities/incident.entity";
import { IncidentUpdate } from "./entities/incident-update.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";

/**
 * Controller for managing production incidents and their timelines.
 */
@ApiTags("Incidents")
@ApiBearerAuth()
@ApiHeader({
  name: "X-Organization-Id",
  required: true,
  description:
    "Organization context — all resources are scoped to this organization.",
})
@OrgRequired()
@UseGuards(OrgRequiredGuard, RolesGuard)
@Controller("incidents")
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
  status: HttpStatus.FORBIDDEN,
  description:
    "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class IncidentController {
  constructor(
    private readonly incidentService: IncidentService,
    private readonly incidentUpdateService: IncidentUpdateService,
  ) {}

  /**
   * Creates a new incident.
   * The organizationId is taken from the OrgContextInterceptor (X-Organization-Id header)
   * and cannot be overridden by the request body.
   * @param req - The incoming request containing the JWT user payload and org context
   * @param dto - The data for the new incident
   * @returns The created incident
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
  @ApiOperation({ summary: "Create a new incident" })
  @ApiCreatedResponse({
    description: "The incident has been successfully created.",
    type: Incident,
  })
  async create(
    @Req() req: Request & { user: { userId: string }; organizationId?: string },
    @Body() dto: CreateIncidentDto,
  ): Promise<Incident> {
    return await this.incidentService.create(dto, req.organizationId);
  }

  /**
   * Retrieves all incidents with optional filters and pagination.
   * @param query - Optional filter and pagination parameters
   * @returns A paginated list of incidents
   */
  @Get()
  @ApiOperation({ summary: "List all incidents" })
  @ApiOkResponse({
    description: "Successfully retrieved incidents list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() query: ListIncidentsQueryDto,
  ): Promise<PaginatedResponseDto<Incident>> {
    const [data, total] = await this.incidentService.findAll(query);
    return new PaginatedResponseDto(
      data,
      total,
      query.skip ?? 0,
      query.take ?? 20,
    );
  }

  /**
   * Retrieves a single incident by ID with all relations.
   * @param id - The UUID of the incident
   * @returns The incident
   */
  @Get(":id")
  @ApiOperation({ summary: "Get incident by ID" })
  @ApiParam({ name: "id", description: "The UUID of the incident" })
  @ApiOkResponse({
    description: "The incident was found.",
    type: Incident,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<Incident> {
    return await this.incidentService.findOne(id, req.organizationId);
  }

  /**
   * Updates an existing incident.
   * @param id - The UUID of the incident to update
   * @param dto - Fields to update
   * @returns The updated incident
   */
  @Patch(":id")
  @Roles("admin")
  @ApiOperation({ summary: "Update an incident" })
  @ApiParam({
    name: "id",
    description: "The UUID of the incident to update",
  })
  @ApiOkResponse({
    description: "The incident has been successfully updated.",
    type: Incident,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateIncidentDto,
    @Req() req: RequestWithOrg,
  ): Promise<Incident> {
    return await this.incidentService.update(id, dto, req.organizationId);
  }

  /**
   * Transitions an incident to a new status.
   * Validates allowed transitions and creates a timeline entry automatically.
   * The author of the timeline entry is derived from the JWT token.
   * @param req - The incoming request containing the JWT user payload
   * @param id - The UUID of the incident
   * @param dto - Target status and optional message
   * @returns The updated incident
   */
  @Patch(":id/status")
  @Roles("admin")
  @ApiOperation({ summary: "Update incident status" })
  @ApiParam({
    name: "id",
    description: "The UUID of the incident to transition",
  })
  @ApiOkResponse({
    description: "The incident status has been successfully updated.",
    type: Incident,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async updateStatus(
    @Req() req: Request & { user: { userId: string } },
    @Param("id") id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ): Promise<Incident> {
    return await this.incidentService.updateStatus(id, dto, req.user.userId);
  }

  /**
   * Removes an incident.
   * @param id - The UUID of the incident to remove
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("admin")
  @ApiOperation({ summary: "Delete an incident" })
  @ApiParam({
    name: "id",
    description: "The UUID of the incident to remove",
  })
  @ApiNoContentResponse({ description: "Incident successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<void> {
    await this.incidentService.remove(id, req.organizationId);
  }

  // ── Timeline sub-resource endpoints ─────────────────────────────────

  /**
   * Creates a manual timeline entry for an incident.
   * The author is derived from the JWT token and cannot be overridden by the body.
   * Available to any authenticated user, not admin-only.
   * @param req - The incoming request containing the JWT user payload
   * @param id - The UUID of the incident
   * @param dto - The update message
   * @returns The created timeline entry
   */
  @Post(":id/updates")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a manual timeline entry" })
  @ApiParam({
    name: "id",
    description: "The UUID of the incident",
  })
  @ApiCreatedResponse({
    description: "The timeline entry has been successfully created.",
    type: IncidentUpdate,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async createUpdate(
    @Req() req: Request & { user: { userId: string } },
    @Param("id") id: string,
    @Body() dto: CreateIncidentUpdateDto,
  ): Promise<IncidentUpdate> {
    return await this.incidentUpdateService.create(id, dto, req.user.userId);
  }

  /**
   * Retrieves the full timeline of updates for an incident.
   * @param id - The UUID of the incident
   * @returns Array of timeline entries ordered chronologically
   */
  @Get(":id/timeline")
  @ApiOperation({ summary: "Get incident timeline" })
  @ApiParam({
    name: "id",
    description: "The UUID of the incident",
  })
  @ApiOkResponse({
    description: "Successfully retrieved the incident timeline.",
    type: [IncidentUpdate],
  })
  async getTimeline(@Param("id") id: string): Promise<IncidentUpdate[]> {
    return await this.incidentUpdateService.findByIncident(id);
  }
}
