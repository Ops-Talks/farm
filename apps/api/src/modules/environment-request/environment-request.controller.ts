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
  ForbiddenException,
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
import { EnvironmentRequestService } from "./environment-request.service";
import { CreateEnvironmentRequestDto } from "./dto/create-environment-request.dto";
import { UpdateEnvironmentRequestDto } from "./dto/update-environment-request.dto";
import { ListEnvironmentRequestsQueryDto } from "./dto/list-environment-requests-query.dto";
import { ReviewEnvironmentRequestDto } from "./dto/review-environment-request.dto";
import { EnvironmentRequest } from "./entities/environment-request.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";

/**
 * Controller for managing developer self-service environment requests
 * including creation, review workflows, and lifecycle management.
 */
@ApiTags("Environment Requests")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@Controller("environment-requests")
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
  description: "Forbidden - User does not have sufficient permissions.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class EnvironmentRequestController {
  constructor(
    private readonly environmentRequestService: EnvironmentRequestService,
  ) {}

  /**
   * Creates a new environment request.
   * Any authenticated user can submit a request. The requestedBy field is
   * automatically set from the authenticated user context.
   * @param req - The incoming request containing the JWT user payload and org context
   * @param dto - The data for the new environment request
   * @returns The created environment request
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new environment request" })
  @ApiCreatedResponse({
    description: "The environment request has been successfully created.",
    type: EnvironmentRequest,
  })
  async create(
    @Req() req: RequestWithOrg,
    @Body() dto: CreateEnvironmentRequestDto,
  ): Promise<EnvironmentRequest> {
    return await this.environmentRequestService.create(
      dto,
      req.user!.userId,
      req.organizationId,
    );
  }

  /**
   * Retrieves all environment requests with optional filters.
   * @param query - Optional filter and pagination parameters
   * @returns A paginated list of environment requests
   */
  @Get()
  @ApiOperation({ summary: "List all environment requests" })
  @ApiOkResponse({
    description: "Successfully retrieved environment requests list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() query: ListEnvironmentRequestsQueryDto,
    @Req() req: RequestWithOrg,
  ): Promise<PaginatedResponseDto<EnvironmentRequest>> {
    if (req.organizationId && !query.organizationId) {
      query.organizationId = req.organizationId;
    }
    const [data, total] = await this.environmentRequestService.findAll(query);
    return new PaginatedResponseDto(
      data,
      total,
      query.skip ?? 0,
      query.take ?? 20,
    );
  }

  /**
   * Retrieves a single environment request by ID.
   * @param id - The UUID of the environment request
   * @returns The environment request with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get environment request by ID" })
  @ApiParam({
    name: "id",
    description: "The UUID of the environment request",
  })
  @ApiOkResponse({
    description: "The environment request was found.",
    type: EnvironmentRequest,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<EnvironmentRequest> {
    return await this.environmentRequestService.findOne(id);
  }

  /**
   * Updates an existing environment request.
   * Only requests in PENDING status can be updated. The requesting user
   * must be the owner of the request or have an admin role.
   * @param id - The UUID of the environment request to update
   * @param req - The incoming request containing the JWT user payload
   * @param dto - Fields to update
   * @returns The updated environment request
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update an environment request" })
  @ApiParam({
    name: "id",
    description: "The UUID of the environment request to update",
  })
  @ApiOkResponse({
    description: "The environment request has been successfully updated.",
    type: EnvironmentRequest,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
    @Body() dto: UpdateEnvironmentRequestDto,
  ): Promise<EnvironmentRequest> {
    const existing = await this.environmentRequestService.findOne(id);
    const isOwner = req.user?.userId === existing.requestedBy;
    const isAdmin = req.user?.roles?.includes("admin") ?? false;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        "Only the request owner or an admin can update this request",
      );
    }

    return await this.environmentRequestService.update(id, dto);
  }

  /**
   * Removes an environment request.
   * Only requests in PENDING status can be removed. Requires admin role.
   * @param id - The UUID of the environment request to remove
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission(Permission.ENVIRONMENT_WRITE)
  @ApiOperation({ summary: "Delete an environment request" })
  @ApiParam({
    name: "id",
    description: "The UUID of the environment request to remove",
  })
  @ApiNoContentResponse({
    description: "Environment request successfully removed.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.environmentRequestService.remove(id);
  }

  /**
   * Approves a pending environment request and simulates provisioning.
   * Requires admin role. The reviewerId is extracted from the authenticated user.
   * @param id - The UUID of the environment request to approve
   * @param req - The incoming request containing the JWT user payload
   * @param dto - Optional review comment
   * @returns The approved and provisioned environment request
   */
  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  @RequiresPermission(Permission.ENVIRONMENT_WRITE)
  @ApiOperation({ summary: "Approve an environment request" })
  @ApiParam({
    name: "id",
    description: "The UUID of the environment request to approve",
  })
  @ApiOkResponse({
    description: "The environment request has been approved and provisioned.",
    type: EnvironmentRequest,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async approve(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
    @Body() dto: ReviewEnvironmentRequestDto,
  ): Promise<EnvironmentRequest> {
    return await this.environmentRequestService.approve(
      id,
      req.user!.userId,
      dto.comment,
    );
  }

  /**
   * Rejects a pending environment request.
   * Requires admin role. The reviewerId is extracted from the authenticated user.
   * @param id - The UUID of the environment request to reject
   * @param req - The incoming request containing the JWT user payload
   * @param dto - Optional review comment explaining the rejection
   * @returns The rejected environment request
   */
  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @RequiresPermission(Permission.ENVIRONMENT_WRITE)
  @ApiOperation({ summary: "Reject an environment request" })
  @ApiParam({
    name: "id",
    description: "The UUID of the environment request to reject",
  })
  @ApiOkResponse({
    description: "The environment request has been rejected.",
    type: EnvironmentRequest,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async reject(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
    @Body() dto: ReviewEnvironmentRequestDto,
  ): Promise<EnvironmentRequest> {
    return await this.environmentRequestService.reject(
      id,
      req.user!.userId,
      dto.comment,
    );
  }

  /**
   * Expires an active environment request.
   * Requires admin role. Marks the environment as expired.
   * @param id - The UUID of the environment request to expire
   * @returns The expired environment request
   */
  @Post(":id/expire")
  @HttpCode(HttpStatus.OK)
  @RequiresPermission(Permission.ENVIRONMENT_WRITE)
  @ApiOperation({ summary: "Expire an active environment request" })
  @ApiParam({
    name: "id",
    description: "The UUID of the environment request to expire",
  })
  @ApiOkResponse({
    description: "The environment request has been expired.",
    type: EnvironmentRequest,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async expire(@Param("id") id: string): Promise<EnvironmentRequest> {
    return await this.environmentRequestService.expire(id);
  }
}
