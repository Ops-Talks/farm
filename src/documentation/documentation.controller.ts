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
} from "@nestjs/common";
import { DocumentationService } from "./documentation.service";
import { CreateDocumentationDto } from "./dto/create-documentation.dto";
import { UpdateDocumentationDto } from "./dto/update-documentation.dto";
import { Documentation } from "./entities/documentation.entity";

/**
 * Controller for managing technical documentation.
 * Provides REST endpoints to create and manage documentation for catalog components.
 */
@Controller("docs")
export class DocumentationController {
  constructor(private readonly documentationService: DocumentationService) {}

  /**
   * Creates a new documentation entry.
   * @param createDocumentationDto - The data for the new documentation entry
   * @returns The created documentation entry
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createDocumentationDto: CreateDocumentationDto,
  ): Documentation {
    return this.documentationService.create(createDocumentationDto);
  }

  /**
   * Retrieves all documentation entries, optionally filtered by component.
   * @param componentId - Optional component ID to filter documentation
   * @returns An array of documentation entries
   */
  @Get()
  findAll(@Query("componentId") componentId?: string): Documentation[] {
    if (componentId) {
      return this.documentationService.findByComponent(componentId);
    }
    return this.documentationService.findAll();
  }

  /**
   * Retrieves a single documentation entry by ID.
   * @param id - The UUID of the documentation entry
   * @returns The documentation entry with the specified ID
   */
  @Get(":id")
  findOne(@Param("id") id: string): Documentation {
    return this.documentationService.findOne(id);
  }

  /**
   * Updates an existing documentation entry.
   * @param id - The UUID of the documentation entry to update
   * @param updateDocumentationDto - Fields to update
   * @returns The updated documentation entry
   */
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateDocumentationDto: UpdateDocumentationDto,
  ): Documentation {
    return this.documentationService.update(id, updateDocumentationDto);
  }

  /**
   * Removes a documentation entry.
   * @param id - The UUID of the documentation entry to remove
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string): void {
    this.documentationService.remove(id);
  }
}
