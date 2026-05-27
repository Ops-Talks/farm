import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Optional,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OptionalOrgGuard } from "../../common/guards/optional-org.guard";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ComponentElasticsearchIndexService } from "./component-elasticsearch-index.service";
import { CreateComponentElasticsearchIndexDto } from "./dto/create-component-elasticsearch-index.dto";
import { ComponentElasticsearchIndex } from "./entities/component-elasticsearch-index.entity";
import {
  ElasticsearchIndexStatsService,
  IndexStats,
} from "./elasticsearch-index-stats.service";
import { CatalogService } from "../catalog/catalog.service";

/**
 * Per-record stats payload returned by the
 * `GET /components/:id/elasticsearch-indices/stats` endpoint.
 */
export interface ComponentIndexStatsResponse {
  indexId: string;
  indexPattern: string;
  esUrl: string | null;
  reachable: boolean;
  stats?: IndexStats;
}

/**
 * REST controller exposing CRUD endpoints to link Elasticsearch index
 * patterns to catalog components (FARM-T401).
 */
@ApiTags("Elasticsearch Indices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OptionalOrgGuard)
@Controller("components/:id/elasticsearch-indices")
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
export class ComponentElasticsearchIndexController {
  constructor(
    private readonly service: ComponentElasticsearchIndexService,
    @Optional()
    private readonly statsService?: ElasticsearchIndexStatsService,
    @Optional()
    private readonly catalogService?: CatalogService,
  ) {}

  /**
   * Lists all Elasticsearch index patterns linked to a component.
   */
  @Get()
  @ApiOperation({ summary: "List Elasticsearch indices linked to a component" })
  @ApiParam({ name: "id", description: "Catalog component UUID" })
  @ApiOkResponse({
    description: "Successfully retrieved linked indices.",
    type: [ComponentElasticsearchIndex],
  })
  findByComponent(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithOrg,
  ): Promise<ComponentElasticsearchIndex[]> {
    return this.service.findByComponent(id, req.organizationId ?? null);
  }

  /**
   * Returns live index stats for every Elasticsearch index pattern linked to
   * the given component (FARM-T403).
   *
   * Per-record `reachable: false` is returned when the cluster URL is not
   * configured for that record (no per-record override and no global env)
   * or when the cluster cannot be contacted. The response array preserves
   * the database order of the linked records.
   */
  @Get("stats")
  @ApiOperation({
    summary: "Live stats for Elasticsearch indices linked to a component",
  })
  @ApiParam({ name: "id", description: "Catalog component UUID" })
  @ApiOkResponse({
    description: "Per-record stats for each linked Elasticsearch index.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Component not found.",
    type: ErrorResponseDto,
  })
  async getStats(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithOrg,
  ): Promise<ComponentIndexStatsResponse[]> {
    if (!this.statsService || !this.catalogService) {
      throw new NotFoundException("Elasticsearch stats service not available");
    }

    // Verifies the component exists; throws NotFoundException otherwise.
    await this.catalogService.findOne(id);

    const records = await this.service.findByComponent(
      id,
      req.organizationId ?? null,
    );
    if (records.length === 0) {
      return [];
    }

    const responses: ComponentIndexStatsResponse[] = [];
    for (const record of records) {
      const result = await this.statsService.getIndexStats(
        [record.indexPattern],
        record.esUrl,
      );

      if (!result.reachable) {
        responses.push({
          indexId: record.id,
          indexPattern: record.indexPattern,
          esUrl: record.esUrl,
          reachable: false,
        });
        continue;
      }

      // The stats service always returns at least one entry per pattern
      // (synthesizing a "missing" placeholder when ES has none).
      const stats = result.stats[0];
      responses.push({
        indexId: record.id,
        indexPattern: record.indexPattern,
        esUrl: record.esUrl,
        reachable: true,
        stats,
      });
    }

    return responses;
  }

  /**
   * Links a new Elasticsearch index pattern to a component.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Link an Elasticsearch index to a component" })
  @ApiParam({ name: "id", description: "Catalog component UUID" })
  @ApiCreatedResponse({
    description: "Index linked successfully.",
    type: ComponentElasticsearchIndex,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      "An identical (componentId, indexPattern) link already exists.",
    type: ErrorResponseDto,
  })
  create(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CreateComponentElasticsearchIndexDto,
    @Req() req: RequestWithOrg,
  ): Promise<ComponentElasticsearchIndex> {
    return this.service.create(id, dto, req.organizationId ?? null);
  }

  /**
   * Removes a single Elasticsearch index link from a component.
   */
  @Delete(":indexId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove an Elasticsearch index link" })
  @ApiParam({ name: "id", description: "Catalog component UUID" })
  @ApiParam({
    name: "indexId",
    description: "ComponentElasticsearchIndex UUID",
  })
  @ApiNoContentResponse({ description: "Link removed successfully." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Link not found for the given component.",
    type: ErrorResponseDto,
  })
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("indexId", new ParseUUIDPipe()) indexId: string,
    @Req() req: RequestWithOrg,
  ): Promise<void> {
    return this.service.remove(id, indexId, req.organizationId ?? null);
  }
}
