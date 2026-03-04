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
import { CatalogService } from "./catalog.service";
import { CreateComponentDto } from "./dto/create-component.dto";
import { UpdateComponentDto } from "./dto/update-component.dto";
import { Component } from "./entities/component.entity";

/**
 * Controller for the software component catalog.
 * Provides REST endpoints to manage components tracked in Farm.
 */
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
  create(@Body() createComponentDto: CreateComponentDto): Component {
    return this.catalogService.create(createComponentDto);
  }

  /**
   * Retrieves all components from the catalog.
   * @returns An array of all components
   */
  @Get("components")
  findAll(): Component[] {
    return this.catalogService.findAll();
  }

  /**
   * Retrieves a single component by ID.
   * @param id - The UUID of the component
   * @returns The component with the specified ID
   */
  @Get("components/:id")
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
  remove(@Param("id") id: string): void {
    this.catalogService.remove(id);
  }
}
