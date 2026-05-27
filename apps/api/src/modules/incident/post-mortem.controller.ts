import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiHeader,
} from "@nestjs/swagger";
import { Request } from "express";
import { PostMortemService } from "./post-mortem.service";
import { CreatePostMortemDto } from "./dto/create-post-mortem.dto";
import { UpdatePostMortemDto } from "./dto/update-post-mortem.dto";
import { PostMortem } from "./entities/post-mortem.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";

/**
 * Controller for managing post-mortem analyses.
 */
@ApiTags("Post-Mortems")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@Controller("post-mortems")
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
export class PostMortemController {
  constructor(private readonly postMortemService: PostMortemService) {}

  /**
   * Creates a new post-mortem for an incident.
   * The organizationId is resolved from the X-Organization-Id header by
   * OptionalOrgGuard and may be undefined when the header is absent.
   * @param req - The incoming request containing the JWT user payload and org context
   * @param dto - The data for the new post-mortem
   * @returns The created post-mortem
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission(Permission.CATALOG_WRITE)
  @ApiOperation({ summary: "Create a new post-mortem" })
  @ApiCreatedResponse({
    description: "The post-mortem has been successfully created.",
    type: PostMortem,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Referenced incident not found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "A post-mortem already exists for this incident.",
    type: ErrorResponseDto,
  })
  async create(
    @Req() req: Request & { user: { userId: string }; organizationId?: string },
    @Body() dto: CreatePostMortemDto,
  ): Promise<PostMortem> {
    return await this.postMortemService.create(dto, req.organizationId);
  }

  /**
   * Retrieves a single post-mortem by its ID.
   * @param id - The UUID of the post-mortem
   * @returns The post-mortem with its related incident
   */
  @Get(":id")
  @ApiOperation({ summary: "Get post-mortem by ID" })
  @ApiParam({ name: "id", description: "The UUID of the post-mortem" })
  @ApiOkResponse({
    description: "The post-mortem was found.",
    type: PostMortem,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<PostMortem> {
    return await this.postMortemService.findOne(id);
  }

  /**
   * Retrieves the post-mortem linked to a specific incident.
   * @param incidentId - The UUID of the incident
   * @returns The post-mortem for that incident
   */
  @Get("by-incident/:incidentId")
  @ApiOperation({ summary: "Get post-mortem by incident ID" })
  @ApiParam({
    name: "incidentId",
    description: "The UUID of the incident",
  })
  @ApiOkResponse({
    description: "The post-mortem was found.",
    type: PostMortem,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "No post-mortem found for this incident.",
    type: ErrorResponseDto,
  })
  async findByIncident(
    @Param("incidentId") incidentId: string,
  ): Promise<PostMortem> {
    const postMortem = await this.postMortemService.findByIncident(incidentId);
    if (!postMortem) {
      throw new NotFoundException(
        `No post-mortem found for incident "${incidentId}"`,
      );
    }
    return postMortem;
  }

  /**
   * Updates an existing post-mortem.
   * @param id - The UUID of the post-mortem to update
   * @param dto - Fields to update
   * @returns The updated post-mortem
   */
  @Patch(":id")
  @RequiresPermission(Permission.CATALOG_WRITE)
  @ApiOperation({ summary: "Update a post-mortem" })
  @ApiParam({
    name: "id",
    description: "The UUID of the post-mortem to update",
  })
  @ApiOkResponse({
    description: "The post-mortem has been successfully updated.",
    type: PostMortem,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePostMortemDto,
  ): Promise<PostMortem> {
    return await this.postMortemService.update(id, dto);
  }

  /**
   * Approves a post-mortem. Sets the approvedBy and approvedAt fields.
   * The approver is derived from the authenticated user's JWT token.
   * @param req - The incoming request containing the JWT user payload
   * @param id - The UUID of the post-mortem to approve
   * @returns The approved post-mortem
   */
  @Patch(":id/approve")
  @RequiresPermission(Permission.CATALOG_WRITE)
  @ApiOperation({ summary: "Approve a post-mortem" })
  @ApiParam({
    name: "id",
    description: "The UUID of the post-mortem to approve",
  })
  @ApiOkResponse({
    description: "The post-mortem has been successfully approved.",
    type: PostMortem,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async approve(
    @Req() req: Request & { user: { userId: string } },
    @Param("id") id: string,
  ): Promise<PostMortem> {
    return await this.postMortemService.approve(id, req.user.userId);
  }
}
