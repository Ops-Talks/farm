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
import { ErrorResponseDto } from "../common/dto/error-response.dto";

/**
 * Controller for managing technical documentation.
 */
@ApiTags("Documentation")
@Controller("docs")
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
  async create(
    @Body() createDocumentationDto: CreateDocumentationDto,
  ): Promise<Documentation> {
    return await this.documentationService.create(createDocumentationDto);
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
  async findAll(
    @Query("componentId") componentId?: string,
  ): Promise<Documentation[]> {
    if (componentId) {
      return await this.documentationService.findByComponent(componentId);
    }
    return await this.documentationService.findAll();
  }

  /**
   * Retrieves a single documentation entry by ID.
   * @param id - The UUID of the documentation entry
   * @returns The documentation entry with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get documentation metadata by ID" })
  @ApiParam({ name: "id", description: "The UUID of the documentation" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Documentation metadata found.",
    type: Documentation,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<Documentation> {
    return await this.documentationService.findOne(id);
  }

  /**
   * Fetches and returns the raw Markdown content for a documentation entry.
   * @param id - The UUID of the documentation entry
   * @returns The raw Markdown content
   */
  @Get(":id/content")
  @ApiOperation({ summary: "Get raw Markdown content by ID" })
  @ApiParam({ name: "id", description: "The UUID of the documentation" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Markdown content successfully fetched.",
    content: { "text/markdown": { schema: { type: "string" } } },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async getContent(@Param("id") id: string): Promise<string> {
    return await this.documentationService.getContent(id);
  }

  /**
   * Updates an existing documentation entry.
   * @param id - The UUID of the documentation entry to update
   * @param updateDocumentationDto - Fields to update
   * @returns The updated documentation entry
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update documentation metadata" })
  @ApiParam({ name: "id", description: "The UUID of the documentation" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Documentation successfully updated.",
    type: Documentation,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateDocumentationDto: UpdateDocumentationDto,
  ): Promise<Documentation> {
    return await this.documentationService.update(id, updateDocumentationDto);
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
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.documentationService.remove(id);
  }
}
