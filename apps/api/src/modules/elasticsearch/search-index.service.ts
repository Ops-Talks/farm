import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";
import { ElasticsearchService } from "./elasticsearch.service";
import type { SearchDocument, SearchDocumentType } from "./elasticsearch.types";

/**
 * Service responsible for mapping domain entities to SearchDocument objects
 * and delegating indexing operations to ElasticsearchService.
 */
@Injectable()
export class SearchIndexService {
  private readonly logger = new Logger(SearchIndexService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(Component)
    private readonly componentRepo: Repository<Component>,
    @InjectRepository(Team)
    private readonly teamRepo: Repository<Team>,
    @InjectRepository(Documentation)
    private readonly docRepo: Repository<Documentation>,
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
    @InjectRepository(Pipeline)
    private readonly pipelineRepo: Repository<Pipeline>,
  ) {}

  /**
   * Maps a single entity to a SearchDocument and indexes it via ElasticsearchService.
   *
   * @param entity - The domain entity to index.
   * @param type - The SearchDocumentType that identifies the entity kind.
   */
  async indexDocument(
    entity: Component | Team | Documentation | Environment | Pipeline,
    type: SearchDocumentType,
  ): Promise<void> {
    const doc = this.mapEntityToDocument(entity, type);
    await this.elasticsearchService.index(doc);
  }

  /**
   * Removes a document from the Elasticsearch index by its entity UUID.
   *
   * @param id - The UUID of the entity whose document should be removed.
   */
  async removeDocument(id: string): Promise<void> {
    await this.elasticsearchService.deleteFromIndex(id);
  }

  /**
   * Fetches all entities from every repository, builds a SearchDocument array,
   * and performs a bulk index operation.
   *
   * When orgId is provided only documents belonging to that organization are
   * fetched and indexed.
   *
   * @param orgId - Optional organization UUID to scope the reindex.
   * @returns An object with the total count of indexed documents.
   */
  async reindexAll(orgId?: string): Promise<{ indexed: number }> {
    const where = orgId ? { organizationId: orgId } : {};

    const [components, teams, docs, environments, pipelines] =
      await Promise.all([
        this.componentRepo.find({ where }),
        this.teamRepo.find({ where }),
        this.docRepo.find({ where }),
        this.envRepo.find({ where }),
        this.pipelineRepo.find({ where }),
      ]);

    const documents: SearchDocument[] = [
      ...components.map((e) => this.mapEntityToDocument(e, "component")),
      ...teams.map((e) => this.mapEntityToDocument(e, "team")),
      ...docs.map((e) => this.mapEntityToDocument(e, "documentation")),
      ...environments.map((e) => this.mapEntityToDocument(e, "environment")),
      ...pipelines.map((e) => this.mapEntityToDocument(e, "pipeline")),
    ];

    await this.elasticsearchService.bulkIndex(documents);

    this.logger.log(
      `Reindex completed: ${documents.length} documents${orgId ? ` for org ${orgId}` : ""}`,
    );

    return { indexed: documents.length };
  }

  /**
   * Maps a domain entity to its normalized SearchDocument representation.
   *
   * @param entity - The source entity.
   * @param type - The document type discriminator.
   */
  private mapEntityToDocument(
    entity: Component | Team | Documentation | Environment | Pipeline,
    type: SearchDocumentType,
  ): SearchDocument {
    const base: SearchDocument = {
      id: entity.id,
      type,
      title: this.resolveTitle(entity, type),
      description: this.resolveDescription(entity),
      tags: this.resolveTags(entity),
      organizationId: (entity as { organizationId?: string }).organizationId,
      updatedAt: entity.updatedAt.toISOString(),
    };

    return base;
  }

  /**
   * Extracts the human-readable title from the entity based on its type.
   */
  private resolveTitle(
    entity: Component | Team | Documentation | Environment | Pipeline,
    type: SearchDocumentType,
  ): string {
    if (type === "documentation") {
      return (entity as Documentation).title;
    }

    return (entity as { name: string }).name;
  }

  /**
   * Extracts the optional description from the entity when available.
   */
  private resolveDescription(
    entity: Component | Team | Documentation | Environment | Pipeline,
  ): string | undefined {
    const desc = (entity as { description?: string | null }).description;
    return desc ?? undefined;
  }

  /**
   * Extracts tags from Component entities; other entity types have no tags.
   */
  private resolveTags(
    entity: Component | Team | Documentation | Environment | Pipeline,
  ): string[] | undefined {
    if ("tags" in entity && Array.isArray(entity.tags)) {
      return entity.tags ?? undefined;
    }

    return undefined;
  }
}
