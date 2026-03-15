import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Environment } from "./entities/environment.entity";
import { Deployment } from "./entities/deployment.entity";
import { Component } from "../catalog/entities/component.entity";
import { EnvironmentsService } from "./environments.service";
import { DeploymentsService } from "./deployments.service";
import { EnvironmentsController } from "./environments.controller";
import { DeploymentsController } from "./deployments.controller";

/**
 * Module for managing deployment environments and deployment tracking.
 * Provides CRUD for environments and deployment lifecycle management.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Environment, Deployment, Component])],
  controllers: [EnvironmentsController, DeploymentsController],
  providers: [EnvironmentsService, DeploymentsService],
  exports: [EnvironmentsService, DeploymentsService],
})
export class EnvironmentsModule {}
