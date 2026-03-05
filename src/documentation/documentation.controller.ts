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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { DocumentationService } from "./documentation.service";
import { CreateDocumentationDto } from "./dto/create-documentation.dto";
import { UpdateDocumentationDto } from "./dto/update-documentation.dto";
import { Documentation } from "./entities/documentation.entity";

/**
 * Controller for managing technical documentation.
 * Provides REST endpoints to create and manage documentation for catalog components.
 */
@ApiTags("Documentation")
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
  @ApiOperation({ summary: "Create a new documentation entry" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Documentation successfully created.",
    type: Documentation,
  })
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
  @ApiOperation({ summary: "List all documentation entries" })
  @ApiQuery({
    name: "componentId",
    required: false,
    description: "Filter docs by component UUID",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return documentation list.",
    type: [Documentation],
  })
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
  @ApiOperation({ summary: "Get documentation by ID" })
  @ApiParam({ name: "id", description: "The UUID of the documentation" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Documentation found.",
    type: Documentation,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Not Found." })
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
  @ApiOperation({ summary: "Update documentation" })
  @ApiParam({ name: "id", description: "The UUID of the documentation" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Documentation successfully updated.",
    type: Documentation,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Not Found." })
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
  @ApiOperation({ summary: "Delete documentation" })
  @ApiParam({ name: "id", description: "The UUID of the documentation" })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: "Deleted." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "Not Found." })
  remove(@Param("id") id: string): void {
    this.documentationService.remove(id);
  }
}
