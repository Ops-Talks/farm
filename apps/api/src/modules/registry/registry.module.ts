import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { RegistryController } from "./registry.controller";
import { RegistryService } from "./registry.service";
import { VulnerabilityService } from "./vulnerability.service";
import { EcrAdapter } from "./adapters/ecr.adapter";
import { GcrAdapter } from "./adapters/gcr.adapter";
import { DockerHubAdapter } from "./adapters/docker-hub.adapter";
import { HarborAdapter } from "./adapters/harbor.adapter";
import { IRegistryAdapter } from "./interfaces/registry-adapter.interface";
import { REGISTRY_ADAPTER } from "./registry.constants";
import { ContainerVulnerability } from "./entities/container-vulnerability.entity";
import { Component } from "../catalog/entities/component.entity";
import {
  VulnerabilitySyncProcessor,
  VULNERABILITY_SYNC_QUEUE,
} from "./processors/vulnerability-sync.processor";
import { VulnerabilitySyncScheduler } from "./processors/vulnerability-sync.scheduler";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";
import { PluginMetadata } from "../plugin-manager/interfaces/plugin.interface";

export { REGISTRY_ADAPTER } from "./registry.constants";

const isTest = process.env.NODE_ENV === "test";

/**
 * Factory that selects and instantiates the appropriate registry adapter
 * based on the REGISTRY_TYPE environment variable.
 * Returns null when no registry type is configured.
 * Exported for direct unit testing.
 */
export function registryAdapterFactory(
  config: ConfigService,
  httpService: HttpService,
  cb: CircuitBreakerService,
): IRegistryAdapter | null {
  const type = config.get<string>("registry.type") ?? "";

  switch (type) {
    case "ecr":
      return new EcrAdapter(config);
    case "gcr":
      return new GcrAdapter(httpService, config, cb);
    case "dockerhub":
      return new DockerHubAdapter(httpService, config, cb);
    case "harbor":
      return new HarborAdapter(httpService, config, cb);
    default:
      return null;
  }
}

/**
 * Feature module for container registry integration.
 *
 * Provides REST endpoints to query repositories, tags, manifests, and
 * vulnerability scan results from ECR, GCP Artifact Registry, or Docker Hub.
 * Also manages container vulnerability persistence and background sync jobs.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ContainerVulnerability, Component]),
    ...(isTest
      ? []
      : [BullModule.registerQueue({ name: VULNERABILITY_SYNC_QUEUE })]),
  ],
  controllers: [RegistryController],
  providers: [
    RegistryService,
    VulnerabilityService,
    {
      provide: REGISTRY_ADAPTER,
      inject: [ConfigService, HttpService, CircuitBreakerService],
      useFactory: registryAdapterFactory,
    },
    ...(isTest ? [] : [VulnerabilitySyncProcessor, VulnerabilitySyncScheduler]),
  ],
  exports: [RegistryService, VulnerabilityService],
})
export class RegistryModule {
  static readonly PLUGIN_METADATA: PluginMetadata = {
    name: "core-registry",
    version: "1.0.0",
    description:
      "Container registry integration (ECR, GCP Artifact Registry, Docker Hub, Harbor)",
  };
}
