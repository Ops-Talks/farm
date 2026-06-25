import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ComponentElasticsearchIndex } from "./entities/component-elasticsearch-index.entity";
import { ComponentElasticsearchIndexService } from "./component-elasticsearch-index.service";
import { ComponentElasticsearchIndexController } from "./component-elasticsearch-index.controller";
import { ElasticsearchIndicesOverviewController } from "./elasticsearch-indices-overview.controller";
import { ElasticsearchIndexStatsService } from "./elasticsearch-index-stats.service";
import { CatalogModule } from "../catalog/catalog.module";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

/**
 * Feature module for Elasticsearch Index Visibility (FARM-S351 / FARM-S352).
 *
 * Provides CRUD endpoints to link Elasticsearch index patterns to catalog
 * components plus a live stats endpoint that proxies the cluster's
 * _cat/indices REST API.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ComponentElasticsearchIndex]),
    CatalogModule,
  ],
  controllers: [
    ComponentElasticsearchIndexController,
    ElasticsearchIndicesOverviewController,
  ],
  providers: [
    ComponentElasticsearchIndexService,
    ElasticsearchIndexStatsService,
  ],
  exports: [ComponentElasticsearchIndexService, ElasticsearchIndexStatsService],
})
export class ElasticsearchIndexModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-elasticsearch-index",
    version: "1.0.0",
    description: "Link Elasticsearch index patterns to catalog components",
  };
}
