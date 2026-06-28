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
import { SloService } from "./slo.service";
import { SloCalculatorService } from "./slo-calculator.service";
import { CreateSloDto } from "./dto/create-slo.dto";
import { UpdateSloDto } from "./dto/update-slo.dto";
import { ListSlosQueryDto } from "./dto/list-slos-query.dto";
import { SloBudgetResponseDto } from "./dto/slo-budget-response.dto";
import { Slo } from "./entities/slo.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";

/**
 * Controller for managing Service Level Objectives and querying
 * error budget status.
 */
@ApiTags("SLOs")
@ApiBearerAuth()
@ApiHeader({
  name: "X-Organization-Id",
  required: true,
  description:
    "Organization context — all resources are scoped to this organization.",
})
@OrgRequired()
@UseGuards(OrgRequiredGuard, RolesGuard)
@Controller("slos")
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
export class SloController {
  constructor(
    private readonly sloService: SloService,
    private readonly sloCalculatorService: SloCalculatorService,
  ) {}

  /**
   * Creates a new Service Level Objective.
   * The organizationId is taken from the OrgContextInterceptor (X-Organization-Id header)
   * and cannot be overridden by the request body.
   * @param req - The incoming request containing the JWT user payload and org context
   * @param createSloDto - The data for the new SLO
   * @returns The created SLO
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
  @ApiOperation({ summary: "Create a new SLO" })
  @ApiCreatedResponse({
    description: "The SLO has been successfully created.",
    type: Slo,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "An SLO with this name already exists.",
    type: ErrorResponseDto,
  })
  async create(
    @Req() req: Request & { user: { userId: string }; organizationId?: string },
    @Body() createSloDto: CreateSloDto,
  ): Promise<Slo> {
    return await this.sloService.create(createSloDto, req.organizationId);
  }

  /**
   * Retrieves all SLOs with optional filters.
   * @param query - Optional filter and pagination parameters
   * @returns A paginated list of SLOs
   */
  @Get()
  @ApiOperation({ summary: "List all SLOs" })
  @ApiOkResponse({
    description: "Successfully retrieved SLOs list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() query: ListSlosQueryDto,
  ): Promise<PaginatedResponseDto<Slo>> {
    const [data, total] = await this.sloService.findAll(query);
    return new PaginatedResponseDto(
      data,
      total,
      query.skip ?? 0,
      query.take ?? 20,
    );
  }

  /**
   * Retrieves a single SLO by ID.
   * @param id - The UUID of the SLO
   * @returns The SLO with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get SLO by ID" })
  @ApiParam({ name: "id", description: "The UUID of the SLO" })
  @ApiOkResponse({
    description: "The SLO was found.",
    type: Slo,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<Slo> {
    return await this.sloService.findOne(id, req.organizationId);
  }

  /**
   * Updates an existing SLO.
   * @param id - The UUID of the SLO to update
   * @param updateSloDto - Fields to update
   * @returns The updated SLO
   */
  @Patch(":id")
  @Roles("admin")
  @ApiOperation({ summary: "Update an SLO" })
  @ApiParam({
    name: "id",
    description: "The UUID of the SLO to update",
  })
  @ApiOkResponse({
    description: "The SLO has been successfully updated.",
    type: Slo,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "An SLO with this name already exists.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateSloDto: UpdateSloDto,
    @Req() req: RequestWithOrg,
  ): Promise<Slo> {
    return await this.sloService.update(id, updateSloDto, req.organizationId);
  }

  /**
   * Removes an SLO.
   * @param id - The UUID of the SLO to remove
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("admin")
  @ApiOperation({ summary: "Delete an SLO" })
  @ApiParam({
    name: "id",
    description: "The UUID of the SLO to remove",
  })
  @ApiNoContentResponse({ description: "SLO successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<void> {
    await this.sloService.remove(id, req.organizationId);
  }

  /**
   * Computes the current error budget for an SLO.
   * @param id - The UUID of the SLO
   * @returns The error budget status
   */
  @Get(":id/budget")
  @ApiOperation({ summary: "Get SLO error budget" })
  @ApiParam({
    name: "id",
    description: "The UUID of the SLO to compute the budget for",
  })
  @ApiOkResponse({
    description: "Successfully computed error budget.",
    type: SloBudgetResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async getBudget(@Param("id") id: string): Promise<SloBudgetResponseDto> {
    return await this.sloCalculatorService.calculateBudget(id);
  }
}
