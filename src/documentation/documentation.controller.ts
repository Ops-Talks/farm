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
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { DocumentationService } from "./documentation.service";
import { CreateDocumentationDto } from "./dto/create-documentation.dto";
import { UpdateDocumentationDto } from "./dto/update-documentation.dto";
import { Documentation } from "./entities/documentation.entity";
import {
  DocumentationTreeNode,
  SearchResult,
} from "./interfaces/documentation.interfaces";
import { ErrorResponseDto } from "../common/dto/error-response.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

/**
 * Controller for managing technical documentation.
 */
@ApiTags("Documentation")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("docs")
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
export class DocumentationController {
  constructor(private readonly documentationService: DocumentationService) {}

  /**
   * Creates a new documentation entry.
   * @param createDocumentationDto - The data for the new documentation entry
   * @returns The created documentation entry
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
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
   * Searches documentation entries by title.
   * @param q - The search query string
   * @param componentId - Optional component ID to scope the search
   * @returns Array of search results with relevance scores
   */
  @Get("search")
  @ApiOperation({ summary: "Search documentation by title" })
  @ApiQuery({ name: "q", description: "Search query string" })
  @ApiQuery({
    name: "componentId",
    required: false,
    description: "Scope search to a specific component",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Search results with relevance scores.",
    type: [SearchResult],
  })
  async search(
    @Query("q") q: string,
    @Query("componentId") componentId?: string,
  ): Promise<SearchResult[]> {
    return await this.documentationService.search(q, componentId);
  }

  /**
   * Returns a navigation tree for documentation entries of a component.
   * @param componentId - The UUID of the component
   * @returns Hierarchical tree of documentation entries
   */
  @Get("tree")
  @ApiOperation({ summary: "Get documentation navigation tree" })
  @ApiQuery({
    name: "componentId",
    description: "The component UUID to build the tree for",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Documentation navigation tree.",
    type: [DocumentationTreeNode],
  })
  async getTree(
    @Query("componentId") componentId: string,
  ): Promise<DocumentationTreeNode[]> {
    return await this.documentationService.buildTree(componentId);
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
   * Fetches Markdown content, renders it to HTML, and sanitizes the output.
   * @param id - The UUID of the documentation entry
   * @returns Sanitized HTML content
   */
  @Get(":id/rendered")
  @ApiOperation({ summary: "Get rendered HTML content by ID" })
  @ApiParam({ name: "id", description: "The UUID of the documentation" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Rendered and sanitized HTML content.",
    content: { "text/html": { schema: { type: "string" } } },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async getRendered(@Param("id") id: string): Promise<string> {
    return await this.documentationService.renderContent(id);
  }

  /**
   * Updates an existing documentation entry.
   * @param id - The UUID of the documentation entry to update
   * @param updateDocumentationDto - Fields to update
   * @returns The updated documentation entry
   */
  @Patch(":id")
  @Roles("admin")
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
  @Roles("admin")
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
