import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { IacModuleService } from "./iac-module.service";
import { IacModuleSyncService } from "./iac-module-sync.service";
import { CreateIacModuleDto } from "./dto/create-iac-module.dto";
import { UpdateIacModuleDto } from "./dto/update-iac-module.dto";
import { LinkComponentDto } from "./dto/link-component.dto";
import { IacModule, IacEngine, IacProvider } from "./entities/iac-module.entity";
import { IacModuleVersion } from "./entities/iac-module-version.entity";

/**
 * REST controller for the IaC Module Catalog (FARM-E68).
 * All endpoints require JWT authentication.
 */
@ApiTags("IaC Modules")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
@Controller("iac-modules")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized.",
  type: ErrorResponseDto,
})
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
export class IacModuleController {
  constructor(
    private readonly iacModuleService: IacModuleService,
    private readonly iacModuleSyncService: IacModuleSyncService,
  ) {}

  /**
   * Lists all IaC modules, with optional search and provider filter.
   */
  @Get()
  @ApiOperation({ summary: "List IaC modules" })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "provider", required: false, enum: IacProvider })
  @ApiQuery({ name: "engine", required: false, enum: IacEngine })
  @ApiOkResponse({
    description: "Successfully retrieved module list.",
    type: [IacModule],
  })
  findAll(
    @Query("search") search?: string,
    @Query("provider") provider?: IacProvider,
    @Query("engine") engine?: IacEngine,
  ): Promise<IacModule[]> {
    return this.iacModuleService.findAll({ search, provider, engine });
  }

  /**
   * Creates a new IaC module catalog entry.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an IaC module" })
  @ApiCreatedResponse({
    description: "Module created successfully.",
    type: IacModule,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "A module with the same name and provider already exists.",
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateIacModuleDto): Promise<IacModule> {
    return this.iacModuleService.create(dto);
  }

  /**
   * Returns a single IaC module by ID.
   */
  @Get(":id")
  @ApiOperation({ summary: "Get an IaC module by ID" })
  @ApiParam({ name: "id", description: "IacModule UUID" })
  @ApiOkResponse({
    description: "Successfully retrieved module.",
    type: IacModule,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Module not found.",
    type: ErrorResponseDto,
  })
  findOne(@Param("id") id: string): Promise<IacModule> {
    return this.iacModuleService.findOne(id);
  }

  /**
   * Returns all version records for a module, ordered by version descending.
   */
  @Get(":id/versions")
  @ApiOperation({ summary: "List versions for an IaC module" })
  @ApiParam({ name: "id", description: "IacModule UUID" })
  @ApiOkResponse({
    description: "Successfully retrieved version list.",
    type: [IacModuleVersion],
  })
  findVersions(@Param("id") id: string): Promise<IacModuleVersion[]> {
    return this.iacModuleService.findVersions(id);
  }

  /**
   * Partially updates an existing IaC module.
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update an IaC module" })
  @ApiParam({ name: "id", description: "IacModule UUID" })
  @ApiOkResponse({
    description: "Module updated successfully.",
    type: IacModule,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Module not found.",
    type: ErrorResponseDto,
  })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateIacModuleDto,
  ): Promise<IacModule> {
    return this.iacModuleService.update(id, dto);
  }

  /**
   * Deletes an IaC module and all its version records.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an IaC module" })
  @ApiParam({ name: "id", description: "IacModule UUID" })
  @ApiNoContentResponse({ description: "Module deleted successfully." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Module not found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    return this.iacModuleService.remove(id);
  }

  /**
   * Triggers a metadata sync for the given module.
   * Discovers new semver tags and parses HCL variable/output declarations.
   */
  @Post(":id/sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Sync module metadata from source repository",
    description:
      "Discovers new semver tags, shallow-clones each new tag, and parses " +
      "variables.tf and outputs.tf into structured metadata.",
  })
  @ApiParam({ name: "id", description: "IacModule UUID" })
  @ApiOkResponse({
    description: "Sync completed.",
    schema: {
      type: "object",
      properties: {
        newVersions: { type: "number" },
        latestVersion: { type: "string", nullable: true },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Module not found.",
    type: ErrorResponseDto,
  })
  async sync(
    @Param("id") id: string,
  ): Promise<{ newVersions: number; latestVersion: string | null }> {
    const module = await this.iacModuleService.findOne(id);
    return this.iacModuleSyncService.sync(module);
  }

  /**
   * Associates this module with a catalog component.
   */
  @Post(":id/link-component")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Link module to a catalog component" })
  @ApiParam({ name: "id", description: "IacModule UUID" })
  @ApiOkResponse({
    description: "Module linked to component.",
    type: IacModule,
  })
  linkComponent(
    @Param("id") id: string,
    @Body() dto: LinkComponentDto,
  ): Promise<IacModule> {
    return this.iacModuleService.linkComponent(id, dto.componentId);
  }

  /**
   * Removes the component association from this module.
   */
  @Delete(":id/unlink-component")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unlink module from its catalog component" })
  @ApiParam({ name: "id", description: "IacModule UUID" })
  @ApiOkResponse({
    description: "Component association removed.",
    type: IacModule,
  })
  unlinkComponent(@Param("id") id: string): Promise<IacModule> {
    return this.iacModuleService.unlinkComponent(id);
  }

  /**
   * Returns all IaC modules linked to a specific catalog component.
   * Equivalent to GET /components/:id/iac-modules described in FARM-T238.
   */
  @Get("component/:componentId")
  @ApiOperation({ summary: "List IaC modules linked to a catalog component" })
  @ApiParam({ name: "componentId", description: "Catalog component UUID" })
  @ApiOkResponse({
    description: "Successfully retrieved modules for component.",
    type: [IacModule],
  })
  getByComponent(
    @Param("componentId") componentId: string,
  ): Promise<IacModule[]> {
    return this.iacModuleService.getModulesByComponent(componentId);
  }
}
