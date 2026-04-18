import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";
import { ElasticsearchModule } from "../elasticsearch/elasticsearch.module";
import { SearchConfig } from "./entities/search-config.entity";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { SearchConfigController } from "./search-config.controller";

/**
 * Feature module providing quick search and advanced faceted search
 * functionality across catalog entities.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Component,
      Team,
      Documentation,
      Environment,
      Pipeline,
      SearchConfig,
    ]),
    ElasticsearchModule,
  ],
  controllers: [SearchController, SearchConfigController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
