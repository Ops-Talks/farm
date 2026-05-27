import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiResponse,
  ApiHeader,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { TagPolicyService } from "./tag-policy.service";
import { KyvernoExportService } from "./kyverno-export.service";
import { TagPolicy } from "./entities/tag-policy.entity";
import { ResourceViolation } from "./entities/resource-violation.entity";
import { CreateTagPolicyDto } from "./dto/create-tag-policy.dto";
import { UpdateTagPolicyDto } from "./dto/update-tag-policy.dto";
import { ListViolationsDto } from "./dto/list-violations.dto";
import { ComplianceSummaryDto } from "./dto/compliance-summary.dto";

/**
 * Controller that exposes REST endpoints for tag governance policy management,
 * violation tracking, compliance reporting, and policy export.
 */
@ApiTags("Tag Policies")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@Controller("tag-policies")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized — authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden — user does not have sufficient permissions.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class TagPolicyController {
  constructor(
    private readonly tagPolicyService: TagPolicyService,
    private readonly kyvernoExportService: KyvernoExportService,
  ) {}

  // ---------------------------------------------------------------------------
  // Violations sub-resource — declared before :id to avoid route shadowing
  // ---------------------------------------------------------------------------

  /**
   * Returns a paginated list of resource violations filtered by the provided
   * query parameters.
   */
  @Get("violations")
  @ApiOperation({ summary: "List resource violations" })
  @ApiOkResponse({
    description: "Paginated list of resource violations.",
    type: [ResourceViolation],
  })
  async listViolations(
    @Query() dto: ListViolationsDto,
  ): Promise<{ data: ResourceViolation[]; total: number }> {
    const [data, total] = await this.tagPolicyService.findViolations(dto);
    return { data, total };
  }

  /**
   * Returns a single resource violation by its UUID.
   */
  @Get("violations/:id")
  @ApiOperation({ summary: "Get a resource violation by ID" })
  @ApiParam({ name: "id", description: "Violation UUID" })
  @ApiOkResponse({
    description: "The requested resource violation.",
    type: ResourceViolation,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Violation not found.",
    type: ErrorResponseDto,
  })
  async getViolation(@Param("id") id: string): Promise<ResourceViolation> {
    return this.tagPolicyService.findViolation(id);
  }

  /**
   * Marks a resource violation as resolved.
   */
  @Patch("violations/:id/resolve")
  @ApiOperation({ summary: "Mark a resource violation as resolved" })
  @ApiParam({ name: "id", description: "Violation UUID" })
  @ApiOkResponse({
    description: "The violation has been marked as resolved.",
    type: ResourceViolation,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Violation not found.",
    type: ErrorResponseDto,
  })
  async resolveViolation(@Param("id") id: string): Promise<ResourceViolation> {
    return this.tagPolicyService.resolveViolation(id);
  }

  /**
   * Returns aggregated compliance statistics for an organization.
   */
  @Get("compliance-summary")
  @ApiOperation({ summary: "Get compliance summary for an organization" })
  @ApiOkResponse({
    description: "Aggregated compliance statistics.",
    type: ComplianceSummaryDto,
  })
  async getComplianceSummary(
    @Query("orgId") orgId: string,
  ): Promise<ComplianceSummaryDto> {
    return this.tagPolicyService.getComplianceSummary(orgId);
  }

  // ---------------------------------------------------------------------------
  // Policy CRUD
  // ---------------------------------------------------------------------------

  /**
   * Returns all tag policies for the given organization.
   */
  @Get()
  @ApiOperation({ summary: "List tag policies for an organization" })
  @ApiOkResponse({
    description: "Array of tag policies for the organization.",
    type: [TagPolicy],
  })
  async findAll(@Query("orgId") orgId: string): Promise<TagPolicy[]> {
    return this.tagPolicyService.findAll(orgId);
  }

  /**
   * Creates a new tag governance policy.
   * Requires the "admin" role.
   */
  @Post()
  @RequiresPermission(Permission.ORG_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new tag governance policy" })
  @ApiCreatedResponse({
    description: "The tag policy has been successfully created.",
    type: TagPolicy,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Bad Request — validation failed.",
    type: ErrorResponseDto,
  })
  async create(@Body() dto: CreateTagPolicyDto): Promise<TagPolicy> {
    return this.tagPolicyService.create(dto);
  }

  /**
   * Returns a single tag policy by its UUID.
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a tag policy by ID" })
  @ApiParam({ name: "id", description: "Tag policy UUID" })
  @ApiOkResponse({
    description: "The requested tag policy.",
    type: TagPolicy,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Policy not found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<TagPolicy> {
    return this.tagPolicyService.findOne(id);
  }

  /**
   * Exports a tag policy as a Kyverno ClusterPolicy YAML manifest.
   * The returned YAML can be applied directly to a Kubernetes cluster running
   * Kyverno to enforce the same required-label rules.
   * Requires the "admin" role.
   */
  @Get(":id/export/kyverno")
  @RequiresPermission(Permission.ORG_MANAGE)
  @ApiOperation({
    summary: "Export a tag policy as a Kyverno ClusterPolicy YAML manifest",
  })
  @ApiParam({ name: "id", description: "Tag policy UUID" })
  @ApiOkResponse({
    description:
      "Kyverno ClusterPolicy YAML string and suggested filename for the policy.",
    schema: {
      type: "object",
      properties: {
        yaml: { type: "string" },
        filename: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Policy not found.",
    type: ErrorResponseDto,
  })
  async exportKyverno(
    @Param("id") id: string,
  ): Promise<{ yaml: string; filename: string }> {
    return this.kyvernoExportService.exportTagPolicyAsClusterPolicy(id);
  }

  /**
   * Partially updates an existing tag policy.
   * Requires the "admin" role.
   */
  @Patch(":id")
  @RequiresPermission(Permission.ORG_MANAGE)
  @ApiOperation({ summary: "Update a tag policy" })
  @ApiParam({ name: "id", description: "Tag policy UUID" })
  @ApiOkResponse({
    description: "The tag policy has been successfully updated.",
    type: TagPolicy,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Policy not found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTagPolicyDto,
  ): Promise<TagPolicy> {
    return this.tagPolicyService.update(id, dto);
  }

  /**
   * Removes a tag policy.
   * Requires the "admin" role.
   */
  @Delete(":id")
  @RequiresPermission(Permission.ORG_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a tag policy" })
  @ApiParam({ name: "id", description: "Tag policy UUID" })
  @ApiNoContentResponse({ description: "Tag policy successfully deleted." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Policy not found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    return this.tagPolicyService.remove(id);
  }
}
