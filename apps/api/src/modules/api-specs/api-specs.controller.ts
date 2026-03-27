import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ApiSpecsService } from "./api-specs.service";
import { ApiSpec } from "./entities/api-spec.entity";
import { ApiConsumer } from "./entities/api-consumer.entity";
import { CreateApiSpecDto } from "./dto/create-api-spec.dto";
import { UpdateApiSpecDto } from "./dto/update-api-spec.dto";
import { AddConsumerDto } from "./dto/add-consumer.dto";
import { DiffQueryDto } from "./dto/diff-query.dto";
import { SpecDiffResult } from "./spec-diff.service";

/**
 * Controller for component-scoped API spec management.
 * Handles creation and listing of specs under a catalog component.
 */
@ApiTags("API Specs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("catalog/components/:componentId/api-specs")
export class ApiSpecsComponentController {
  constructor(private readonly apiSpecsService: ApiSpecsService) {}

  @ApiOperation({ summary: "Create an API spec for a component" })
  @ApiParam({ name: "componentId", description: "Catalog component UUID" })
  @ApiCreatedResponse({ type: ApiSpec })
  @Post()
  create(
    @Param("componentId") componentId: string,
    @Body() dto: CreateApiSpecDto,
  ): Promise<ApiSpec> {
    return this.apiSpecsService.create(componentId, dto);
  }

  @ApiOperation({ summary: "List all API specs for a component" })
  @ApiParam({ name: "componentId", description: "Catalog component UUID" })
  @ApiOkResponse({ type: [ApiSpec] })
  @Get()
  findAll(@Param("componentId") componentId: string): Promise<ApiSpec[]> {
    return this.apiSpecsService.findAllByComponent(componentId);
  }
}

/**
 * Controller for retrieving APIs consumed by a catalog component.
 */
@ApiTags("API Specs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("catalog/components/:componentId/consumed-apis")
export class ConsumedApisController {
  constructor(private readonly apiSpecsService: ApiSpecsService) {}

  @ApiOperation({ summary: "List API specs consumed by a component" })
  @ApiParam({ name: "componentId", description: "Catalog component UUID" })
  @ApiOkResponse({ type: [ApiSpec] })
  @Get()
  findConsumedApis(
    @Param("componentId") componentId: string,
  ): Promise<ApiSpec[]> {
    return this.apiSpecsService.findConsumedApis(componentId);
  }
}

/**
 * Controller for spec-level operations: get, update, delete, diff, and
 * consumer management.
 */
@ApiTags("API Specs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("api-specs")
export class ApiSpecsController {
  constructor(private readonly apiSpecsService: ApiSpecsService) {}

  @ApiOperation({ summary: "Get a single API spec by ID" })
  @ApiParam({ name: "id", description: "API spec UUID" })
  @ApiOkResponse({ type: ApiSpec })
  @Get(":id")
  findOne(@Param("id") id: string): Promise<ApiSpec> {
    return this.apiSpecsService.findOne(id);
  }

  @ApiOperation({ summary: "Update an API spec (admin only)" })
  @ApiParam({ name: "id", description: "API spec UUID" })
  @ApiOkResponse({ type: ApiSpec })
  @Roles("admin")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateApiSpecDto,
  ): Promise<ApiSpec> {
    return this.apiSpecsService.update(id, dto);
  }

  @ApiOperation({ summary: "Delete an API spec (admin only)" })
  @ApiParam({ name: "id", description: "API spec UUID" })
  @ApiNoContentResponse()
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(":id")
  remove(@Param("id") id: string): Promise<void> {
    return this.apiSpecsService.remove(id);
  }

  @ApiOperation({ summary: "Diff two API specs" })
  @ApiParam({ name: "id", description: "Baseline API spec UUID" })
  @ApiOkResponse({ description: "Structural diff result" })
  @Get(":id/diff")
  diff(
    @Param("id") id: string,
    @Query() query: DiffQueryDto,
  ): Promise<SpecDiffResult> {
    return this.apiSpecsService.diff(id, query.compareWith);
  }

  @ApiOperation({ summary: "Register a consumer for an API spec" })
  @ApiParam({ name: "id", description: "API spec UUID" })
  @ApiCreatedResponse({ type: ApiConsumer })
  @Post(":id/consumers")
  addConsumer(
    @Param("id") id: string,
    @Body() dto: AddConsumerDto,
  ): Promise<ApiConsumer> {
    return this.apiSpecsService.addConsumer(id, dto);
  }

  @ApiOperation({ summary: "Remove a consumer from an API spec (admin only)" })
  @ApiParam({ name: "id", description: "API spec UUID" })
  @ApiParam({ name: "consumerId", description: "Consumer record UUID" })
  @ApiNoContentResponse()
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(":id/consumers/:consumerId")
  removeConsumer(
    @Param("id") id: string,
    @Param("consumerId") consumerId: string,
  ): Promise<void> {
    return this.apiSpecsService.removeConsumer(id, consumerId);
  }
}
