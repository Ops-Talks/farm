import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from "typeorm";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";
import { SearchIndexService } from "./search-index.service";
import type { SearchDocumentType } from "./elasticsearch.types";

/**
 * TypeORM entity subscriber that keeps the Elasticsearch index in sync with
 * database changes for the five core entity types.
 *
 * The subscriber registers itself on the DataSource during module initialization
 * rather than relying on TypeORM's own discovery mechanism, which simplifies
 * testing and avoids issues with NestJS DI lifecycle ordering.
 *
 * All indexing calls are fire-and-forget: errors are logged but never allowed
 * to propagate and interrupt the originating database transaction.
 */
@Injectable()
export class SearchSubscriber
  implements EntitySubscriberInterface, OnModuleInit
{
  private readonly logger = new Logger(SearchSubscriber.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly searchIndexService: SearchIndexService,
  ) {}

  /**
   * Registers this subscriber with the TypeORM DataSource after the NestJS
   * module has been fully initialized.
   */
  onModuleInit(): void {
    this.dataSource.subscribers.push(this);
  }

  /**
   * Determines the SearchDocumentType for the given entity, or returns null
   * when the entity is not one of the five tracked types.
   */
  private resolveType(entity: unknown): SearchDocumentType | null {
    if (entity instanceof Component) return "component";
    if (entity instanceof Team) return "team";
    if (entity instanceof Documentation) return "documentation";
    if (entity instanceof Environment) return "environment";
    if (entity instanceof Pipeline) return "pipeline";
    return null;
  }

  /**
   * Fired after a new entity row is inserted into the database.
   * Triggers an asynchronous Elasticsearch index operation.
   */
  afterInsert(event: InsertEvent<unknown>): void {
    const type = this.resolveType(event.entity);

    if (!type) {
      return;
    }

    const entity = event.entity as
      | Component
      | Team
      | Documentation
      | Environment
      | Pipeline;

    void Promise.resolve()
      .then(() => this.searchIndexService.indexDocument(entity, type))
      .catch((e: unknown) =>
        this.logger.error(
          `afterInsert: failed to index ${type} ${(entity as { id?: string }).id}`,
          e,
        ),
      );
  }

  /**
   * Fired after an existing entity row is updated in the database.
   * Triggers an asynchronous Elasticsearch re-index operation.
   */
  afterUpdate(event: UpdateEvent<unknown>): void {
    const type = this.resolveType(event.entity);

    if (!type || !event.entity) {
      return;
    }

    const entity = event.entity as
      | Component
      | Team
      | Documentation
      | Environment
      | Pipeline;

    void Promise.resolve()
      .then(() => this.searchIndexService.indexDocument(entity, type))
      .catch((e: unknown) =>
        this.logger.error(
          `afterUpdate: failed to re-index ${type} ${(entity as { id?: string }).id}`,
          e,
        ),
      );
  }
}
