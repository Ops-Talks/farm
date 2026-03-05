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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from "@nestjs/swagger";
import { CatalogService } from "./catalog.service";
import { CreateComponentDto } from "./dto/create-component.dto";
import { UpdateComponentDto } from "./dto/update-component.dto";
import { RegisterComponentYamlDto } from "./dto/register-component-yaml.dto";
import { CreateLocationDto } from "./dto/create-location.dto";
import { Component } from "./entities/component.entity";
import { ErrorResponseDto } from "../common/dto/error-response.dto";

/**
 * Controller for the software component catalog.
 * Provides REST endpoints to manage components tracked in Farm.
 */
@ApiTags("Catalog")
@Controller("catalog")
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
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * Triggers discovery on a new repository location.
   * @param createLocationDto - The location to scan
   * @returns A summary of the discovery process
   */
  @Post("locations")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Register a new location for discovery" })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: "The discovery process has been initiated.",
  })
  async discoverFromLocation(
    @Body() createLocationDto: CreateLocationDto,
  ): Promise<{ message: string; discovered: number }> {
    const discovered = await this.catalogService.discoverFromLocation(
      createLocationDto.url,
    );
    return {
      message: `Discovery initiated for ${createLocationDto.url}`,
      discovered,
    };
  }

  /**
   * Registers a component using YAML content.
   * @param registerYamlDto - The YAML content
   * @returns The registered component
   */
  @Post("register-yaml")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a component via YAML content" })
  @ApiCreatedResponse({
    description: "The component has been successfully registered.",
    type: Component,
  })
  async registerYaml(
    @Body() registerYamlDto: RegisterComponentYamlDto,
  ): Promise<Component> {
    return await this.catalogService.registerYaml(registerYamlDto.yaml);
  }

  /**
   * Creates a new component in the catalog.
   * @param createComponentDto - The data for the new component
   * @returns The created component
   */
  @Post("components")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new component" })
  @ApiCreatedResponse({
    description: "The component has been successfully created.",
    type: Component,
  })
  async create(
    @Body() createComponentDto: CreateComponentDto,
  ): Promise<Component> {
    return await this.catalogService.create(createComponentDto);
  }

  /**
   * Retrieves all components from the catalog.
   * @returns An array of all components
   */
  @Get("components")
  @ApiOperation({ summary: "List all components" })
  @ApiOkResponse({
    description: "Successfully retrieved component list.",
    type: [Component],
  })
  async findAll(): Promise<Component[]> {
    return await this.catalogService.findAll();
  }

  /**
   * Retrieves a single component by ID.
   * @param id - The UUID of the component
   * @returns The component with the specified ID
   */
  @Get("components/:id")
  @ApiOperation({ summary: "Get component by ID" })
  @ApiParam({ name: "id", description: "The UUID of the component" })
  @ApiOkResponse({
    description: "The component was found.",
    type: Component,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<Component> {
    return await this.catalogService.findOne(id);
  }

  /**
   * Updates an existing component.
   * @param id - The UUID of the component to update
   * @param updateComponentDto - Fields to update
   * @returns The updated component
   */
  @Patch("components/:id")
  @ApiOperation({ summary: "Update a component" })
  @ApiParam({ name: "id", description: "The UUID of the component to update" })
  @ApiOkResponse({
    description: "The component has been successfully updated.",
    type: Component,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateComponentDto: UpdateComponentDto,
  ): Promise<Component> {
    return await this.catalogService.update(id, updateComponentDto);
  }

  /**
   * Removes a component from the catalog.
   * @param id - The UUID of the component to remove
   */
  @Delete("components/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a component" })
  @ApiParam({ name: "id", description: "The UUID of the component to remove" })
  @ApiNoContentResponse({ description: "Component successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.catalogService.remove(id);
  }
}
