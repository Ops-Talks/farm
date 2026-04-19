import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";
import { ElasticsearchService } from "./elasticsearch.service";
import { SearchIndexService } from "./search-index.service";
import { SearchSubscriber } from "./search.subscriber";
import { SearchReindexController } from "./search-reindex.controller";

/**
 * Feature module that provides Elasticsearch indexing and advanced search
 * capabilities for the Farm platform.
 *
 * Responsibilities:
 * - Manages the @elastic/elasticsearch Client lifecycle via ElasticsearchService.
 * - Maps domain entities to SearchDocument objects via SearchIndexService.
 * - Keeps the index up to date via SearchSubscriber (TypeORM entity subscriber).
 * - Exposes an admin-only POST /search/reindex endpoint via SearchReindexController.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Component,
      Team,
      Documentation,
      Environment,
      Pipeline,
    ]),
  ],
  controllers: [SearchReindexController],
  providers: [ElasticsearchService, SearchIndexService, SearchSubscriber],
  exports: [ElasticsearchService, SearchIndexService],
})
export class ElasticsearchModule {}
