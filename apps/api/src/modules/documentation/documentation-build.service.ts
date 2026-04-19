import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DocumentationBuild } from "./entities/documentation-build.entity";

/**
 * Service responsible for creating and managing documentation build records.
 */
@Injectable()
export class DocumentationBuildService {
  private readonly logger = new Logger(DocumentationBuildService.name);

  constructor(
    @InjectRepository(DocumentationBuild)
    private readonly buildRepository: Repository<DocumentationBuild>,
  ) {}

  /**
   * Creates a new documentation build record with status set to 'building'.
   * @param componentId - The UUID of the component being built
   * @param version - The version tag for this build
   * @param sourceType - The documentation source format (mkdocs or markdown)
   * @param repoUrl - The remote Git URL used for this build (optional)
   * @returns The newly created build record
   */
  async create(
    componentId: string,
    version: string,
    sourceType: "mkdocs" | "markdown",
    repoUrl?: string,
  ): Promise<DocumentationBuild> {
    this.logger.log(
      `Creating build record for component ${componentId} version ${version}`,
    );
    const build = this.buildRepository.create({
      componentId,
      version,
      sourceType,
      repoUrl: repoUrl ?? null,
      status: "building",
      buildLog: null,
      artifactsPath: null,
      completedAt: null,
    });
    return this.buildRepository.save(build);
  }

  /**
   * Updates the status of an existing build record and merges optional extras.
   * @param id - The UUID of the build record to update
   * @param status - The new build status
   * @param extras - Optional fields to merge: buildLog, artifactsPath, completedAt
   * @returns The updated build record
   */
  async updateStatus(
    id: string,
    status: "building" | "ready" | "failed",
    extras?: {
      buildLog?: string;
      artifactsPath?: string;
      completedAt?: Date;
      sourceType?: "mkdocs" | "markdown";
    },
  ): Promise<DocumentationBuild> {
    this.logger.log(`Updating build ${id} status to ${status}`);
    await this.buildRepository.update(id, { status, ...extras });
    const build = await this.buildRepository.findOneBy({ id });
    if (!build) {
      throw new NotFoundException(`Documentation build ${id} not found`);
    }
    return build;
  }

  /**
   * Returns all build records for a component ordered by triggeredAt descending.
   * @param componentId - The UUID of the component
   * @returns Array of build records, most recent first
   */
  async findByComponent(componentId: string): Promise<DocumentationBuild[]> {
    return this.buildRepository.find({
      where: { componentId },
      order: { triggeredAt: "DESC" },
    });
  }

  /**
   * Returns all builds with status 'ready' for a component ordered by triggeredAt descending.
   * The first element is the latest build and serves as the default selection for callers.
   * @param componentId - The UUID of the component
   * @returns Array of ready build records, most recent first
   */
  async findVersions(componentId: string): Promise<DocumentationBuild[]> {
    return this.buildRepository.find({
      where: { componentId, status: "ready" },
      order: { triggeredAt: "DESC" },
    });
  }

  /**
   * Returns the most recent build with status 'ready' for a component.
   * @param componentId - The UUID of the component
   * @returns The latest ready build, or null if none exists
   */
  async findLatestReady(
    componentId: string,
  ): Promise<DocumentationBuild | null> {
    const results = await this.buildRepository.find({
      where: { componentId, status: "ready" },
      order: { triggeredAt: "DESC" },
      take: 1,
    });
    return results[0] ?? null;
  }
}
