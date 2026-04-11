import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { Environment } from "../environments/entities/environment.entity";
import { Pipeline } from "../pipelines/entities/pipeline.entity";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";

/**
 * Feature module providing cross-entity quick search functionality.
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
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
