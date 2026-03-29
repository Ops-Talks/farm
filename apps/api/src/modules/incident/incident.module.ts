import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Incident } from "./entities/incident.entity";
import { IncidentUpdate } from "./entities/incident-update.entity";
import { PostMortem } from "./entities/post-mortem.entity";
import { Component } from "../catalog/entities/component.entity";
import { Environment } from "../environments/entities/environment.entity";
import { IncidentService } from "./incident.service";
import { IncidentUpdateService } from "./incident-update.service";
import { PostMortemService } from "./post-mortem.service";
import { IncidentController } from "./incident.controller";
import { PostMortemController } from "./post-mortem.controller";

/**
 * Module for incident management, timeline tracking, and post-mortem analysis.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Incident,
      IncidentUpdate,
      PostMortem,
      Component,
      Environment,
    ]),
  ],
  controllers: [IncidentController, PostMortemController],
  providers: [IncidentService, IncidentUpdateService, PostMortemService],
  exports: [IncidentService],
})
export class IncidentModule {}
