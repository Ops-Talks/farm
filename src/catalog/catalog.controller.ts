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
import { Component } from "./entities/component.entity";

/**
 * Controller for the software component catalog.
 * Provides REST endpoints to manage components tracked in Farm.
 */
@ApiTags("Catalog")
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

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
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input." })
  create(@Body() createComponentDto: CreateComponentDto): Component {
    return this.catalogService.create(createComponentDto);
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
  findAll(): Component[] {
    return this.catalogService.findAll();
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
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Not Found." })
  findOne(@Param("id") id: string): Component {
    return this.catalogService.findOne(id);
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
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Not Found." })
  update(
    @Param("id") id: string,
    @Body() updateComponentDto: UpdateComponentDto,
  ): Component {
    return this.catalogService.update(id, updateComponentDto);
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
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Not Found." })
  remove(@Param("id") id: string): void {
    this.catalogService.remove(id);
  }
}
