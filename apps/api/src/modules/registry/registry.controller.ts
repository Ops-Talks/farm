import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Optional,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiHeader,
} from "@nestjs/swagger";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { OrgRequired } from "../../common/decorators/org-required.decorator";
import { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { RegistryService } from "./registry.service";
import {
  RepositoryDto,
  TagDto,
  ManifestDto,
  ScanResultDto,
  HarborReplicationPolicy,
} from "./interfaces/registry-adapter.interface";
import { ContainerVulnerability } from "./entities/container-vulnerability.entity";
import {
  VulnerabilityService,
  VulnerabilitySummary,
} from "./vulnerability.service";
import { VulnerabilitySeverity } from "./enums/vulnerability-severity.enum";
import {
  VULNERABILITY_SYNC_QUEUE,
  VulnerabilitySyncJobData,
} from "./processors/vulnerability-sync.processor";
import { Component } from "../catalog/entities/component.entity";

/**
 * Controller exposing container registry query endpoints.
 * All routes require a valid JWT token.
 */
@ApiTags("Registry")
@ApiBearerAuth()
@ApiHeader({
  name: "X-Organization-Id",
  required: true,
  description:
    "Organization context — all resources are scoped to this organization.",
})
@OrgRequired()
@UseGuards(JwtAuthGuard, OrgRequiredGuard)
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized — missing or invalid JWT.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description:
    "Forbidden - User does not have sufficient permissions or X-Organization-Id header is missing.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
@Controller("registry")
export class RegistryController {
  constructor(
    private readonly registryService: RegistryService,
    @Optional() private readonly vulnService?: VulnerabilityService,
    @Optional()
    @InjectQueue(VULNERABILITY_SYNC_QUEUE)
    private readonly vulnQueue?: Queue<VulnerabilitySyncJobData> | null,
    @Optional()
    @InjectRepository(Component)
    private readonly componentRepo?: Repository<Component> | null,
  ) {}

  @ApiOperation({ summary: "List all repositories in the configured registry" })
  @ApiOkResponse({ description: "Array of repository descriptors" })
  @Get("repositories")
  listRepositories(): Promise<RepositoryDto[]> {
    return this.registryService.listRepositories();
  }

  @ApiOperation({ summary: "List Harbor replication policies" })
  @ApiOkResponse({
    description:
      "Array of Harbor replication policy descriptors. Empty when adapter is not Harbor.",
  })
  @Get("harbor/replications")
  listHarborReplications(): Promise<HarborReplicationPolicy[]> {
    return this.registryService.listHarborReplications();
  }

  @ApiOperation({ summary: "List all tags for a repository" })
  @ApiParam({
    name: "name",
    description:
      "URL-encoded repository name (e.g. my-app or namespace%2Fmy-app)",
  })
  @ApiOkResponse({ description: "Array of tag descriptors" })
  @Get("repositories/:name/tags")
  listTags(@Param("name") name: string): Promise<TagDto[]> {
    return this.registryService.listTags(name);
  }

  @ApiOperation({ summary: "Get the manifest for a specific image tag" })
  @ApiParam({ name: "name", description: "URL-encoded repository name" })
  @ApiParam({ name: "tag", description: "Image tag" })
  @ApiOkResponse({ description: "Manifest descriptor" })
  @Get("repositories/:name/manifest/:tag")
  getManifest(
    @Param("name") name: string,
    @Param("tag") tag: string,
  ): Promise<ManifestDto> {
    return this.registryService.getManifest(name, tag);
  }

  @ApiOperation({
    summary: "Get vulnerability scan results for a specific image tag",
  })
  @ApiParam({ name: "name", description: "URL-encoded repository name" })
  @ApiParam({ name: "tag", description: "Image tag" })
  @ApiOkResponse({ description: "Scan result descriptor" })
  @Get("repositories/:name/scan/:tag")
  getScanResults(
    @Param("name") name: string,
    @Param("tag") tag: string,
  ): Promise<ScanResultDto> {
    return this.registryService.getScanResults(name, tag);
  }

  @Get("components/:componentId/vulnerabilities")
  @ApiOperation({ summary: "List vulnerabilities for a component" })
  @ApiParam({ name: "componentId", description: "Component UUID" })
  @ApiQuery({ name: "severity", enum: VulnerabilitySeverity, required: false })
  @ApiOkResponse({ type: [ContainerVulnerability] })
  async listVulnerabilities(
    @Param("componentId") componentId: string,
    @Query("severity") severity?: VulnerabilitySeverity,
    @Req() req?: RequestWithOrg,
  ): Promise<ContainerVulnerability[]> {
    if (!this.vulnService) {
      throw new ServiceUnavailableException(
        "Vulnerability service not available",
      );
    }
    if (this.componentRepo) {
      const where: Record<string, unknown> = { id: componentId };
      if (req?.organizationId) where["organizationId"] = req.organizationId;
      const component = await this.componentRepo.findOne({ where });
      if (!component)
        throw new NotFoundException(`Component ${componentId} not found`);
    }
    return this.vulnService.findByComponent(componentId, severity);
  }

  @Get("components/:componentId/vulnerabilities/summary")
  @ApiOperation({
    summary: "Get vulnerability severity summary for a component",
  })
  @ApiParam({ name: "componentId", description: "Component UUID" })
  @ApiOkResponse({ description: "Severity counts" })
  async getVulnerabilitySummary(
    @Param("componentId") componentId: string,
    @Req() req?: RequestWithOrg,
  ): Promise<VulnerabilitySummary> {
    if (!this.vulnService) {
      throw new ServiceUnavailableException(
        "Vulnerability service not available",
      );
    }
    if (this.componentRepo) {
      const where: Record<string, unknown> = { id: componentId };
      if (req?.organizationId) where["organizationId"] = req.organizationId;
      const component = await this.componentRepo.findOne({ where });
      if (!component)
        throw new NotFoundException(`Component ${componentId} not found`);
    }
    return this.vulnService.getSummary(componentId);
  }

  @Post("components/:componentId/vulnerabilities/sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Trigger a vulnerability sync for a component" })
  @ApiParam({ name: "componentId", description: "Component UUID" })
  @ApiOkResponse({ description: "Sync job enqueued or executed" })
  async syncVulnerabilities(
    @Param("componentId") componentId: string,
    @Req() req?: RequestWithOrg,
  ): Promise<{ queued: boolean; count?: number }> {
    if (!this.componentRepo) {
      throw new ServiceUnavailableException(
        "Component repository not available",
      );
    }
    if (!this.vulnService) {
      throw new ServiceUnavailableException(
        "Vulnerability service not available",
      );
    }

    const where: Record<string, unknown> = { id: componentId };
    if (req?.organizationId) where["organizationId"] = req.organizationId;
    const component = await this.componentRepo.findOne({ where });
    if (!component)
      throw new NotFoundException(`Component ${componentId} not found`);
    if (!component.containerImage) {
      throw new BadRequestException(
        "Component has no container image configured",
      );
    }

    const { image, latestTag, registry } = component.containerImage;
    const tag = latestTag ?? "latest";

    if (this.vulnQueue) {
      await this.vulnQueue.add(
        "sync",
        { componentId, componentName: component.name, image, tag, registry },
        { removeOnComplete: 100 },
      );
      return { queued: true };
    }

    // Fallback: run sync inline when queue is not available
    const results = await this.vulnService.syncForComponent(
      componentId,
      component.name,
      image,
      tag,
      registry,
    );
    return { queued: false, count: results.length };
  }

  /**
   * Returns whether a registry adapter is configured.
   */
  @Get("available")
  @ApiOperation({ summary: "Check if a registry adapter is configured" })
  @ApiOkResponse({ description: "Availability status" })
  getAvailability(): { available: boolean; reason?: string } {
    const available = this.registryService.adapterType !== null;
    return available
      ? { available: true }
      : {
          available: false,
          reason: "No registry adapter configured. Set REGISTRY_TYPE.",
        };
  }
}
