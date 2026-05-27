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
import { AlertingService } from "./alerting.service";
import { CreateAlertingRuleDto } from "./dto/create-alerting-rule.dto";
import { UpdateAlertingRuleDto } from "./dto/update-alerting-rule.dto";
import { ListAlertingRulesQueryDto } from "./dto/list-alerting-rules-query.dto";
import { AlertingRule } from "./entities/alerting-rule.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequiresPermission } from "../../common/decorators/requires-permission.decorator";
import { Permission } from "@farm/types";

/**
 * Controller for managing PromQL-based alerting rules.
 */
@ApiTags("Alerting Rules")
@ApiBearerAuth()
@ApiHeader({
  name: "x-organization-id",
  required: true,
  description: "Organization ID",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@Controller("alerting-rules")
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
export class AlertingController {
  constructor(private readonly alertingService: AlertingService) {}

  /**
   * Creates a new alerting rule.
   * @param createAlertingRuleDto - The data for the new rule
   * @returns The created alerting rule
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission(Permission.CATALOG_WRITE)
  @ApiOperation({ summary: "Create a new alerting rule" })
  @ApiCreatedResponse({
    description: "The alerting rule has been successfully created.",
    type: AlertingRule,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "An alerting rule with this name already exists.",
    type: ErrorResponseDto,
  })
  async create(
    @Body() createAlertingRuleDto: CreateAlertingRuleDto,
  ): Promise<AlertingRule> {
    return await this.alertingService.create(createAlertingRuleDto);
  }

  /**
   * Retrieves all alerting rules with optional filters.
   * @param query - Optional filter and pagination parameters
   * @returns A paginated list of alerting rules
   */
  @Get()
  @ApiOperation({ summary: "List all alerting rules" })
  @ApiOkResponse({
    description: "Successfully retrieved alerting rules list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() query: ListAlertingRulesQueryDto,
  ): Promise<PaginatedResponseDto<AlertingRule>> {
    const [data, total] = await this.alertingService.findAll(query);
    return new PaginatedResponseDto(
      data,
      total,
      query.skip ?? 0,
      query.take ?? 20,
    );
  }

  /**
   * Retrieves a single alerting rule by ID.
   * @param id - The UUID of the rule
   * @returns The alerting rule with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get alerting rule by ID" })
  @ApiParam({ name: "id", description: "The UUID of the alerting rule" })
  @ApiOkResponse({
    description: "The alerting rule was found.",
    type: AlertingRule,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<AlertingRule> {
    return await this.alertingService.findOne(id);
  }

  /**
   * Updates an existing alerting rule.
   * @param id - The UUID of the rule to update
   * @param updateAlertingRuleDto - Fields to update
   * @returns The updated alerting rule
   */
  @Patch(":id")
  @RequiresPermission(Permission.CATALOG_WRITE)
  @ApiOperation({ summary: "Update an alerting rule" })
  @ApiParam({
    name: "id",
    description: "The UUID of the alerting rule to update",
  })
  @ApiOkResponse({
    description: "The alerting rule has been successfully updated.",
    type: AlertingRule,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "An alerting rule with this name already exists.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateAlertingRuleDto: UpdateAlertingRuleDto,
  ): Promise<AlertingRule> {
    return await this.alertingService.update(id, updateAlertingRuleDto);
  }

  /**
   * Removes an alerting rule.
   * @param id - The UUID of the rule to remove
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission(Permission.CATALOG_WRITE)
  @ApiOperation({ summary: "Delete an alerting rule" })
  @ApiParam({
    name: "id",
    description: "The UUID of the alerting rule to remove",
  })
  @ApiNoContentResponse({ description: "Alerting rule successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.alertingService.remove(id);
  }
}
