import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Optional,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, FindOptionsWhere } from "typeorm";
import * as yaml from "js-yaml";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter } from "prom-client";
import {
  Component,
  ComponentKind,
  ComponentKindGroup,
  ComponentLifecycle,
  COMPONENT_KIND_GROUPS,
} from "./entities/component.entity";
import { CreateComponentDto } from "./dto/create-component.dto";
import { UpdateComponentDto } from "./dto/update-component.dto";
import { SetContainerImageDto } from "./dto/set-container-image.dto";
import { EventsGateway } from "../../common/events/events.gateway";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RegistryService } from "../registry/registry.service";

/**
 * Interface representing the structure of a catalog-info.yaml file.
 */
interface CatalogInfoYaml {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    description?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  spec: {
    type?: string;
    owner: string;
    lifecycle?: string;
    dependsOn?: string[];
    /** Optional inline Helm chart configuration discovered from spec.helm */
    helm?: {
      repo?: string;
      chart?: string;
      version?: string;
      valuesRef?: string;
    };
    [key: string]: unknown;
  };
}

/**
 * Service responsible for managing the software component catalog.
 * Provides CRUD operations for components tracked in Farm.
 */
@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    @Optional() private readonly eventsGateway?: EventsGateway,
    @Optional() private readonly eventEmitter?: EventEmitter2,
    @Optional()
    @InjectMetric("component_operations_total")
    private readonly componentOperationsTotal?: Counter<string>,
    @Optional()
    @Inject(RegistryService)
    private readonly registryService?: RegistryService,
  ) {}

  /**
   * Clones a repository, discovers catalog-info.yaml files, and registers them.
   * @param url - The URL of the git repository
   * @returns The number of components discovered
   */
  async discoverFromLocation(url: string): Promise<number> {
    this.validateGitUrl(url);
    const tempDir = path.join("/tmp/farm-discovery", randomUUID());
    this.logger.log(`Cloning ${url} into ${tempDir}`);

    try {
      await this.gitClone(url, tempDir);
      this.logger.log(`Clone successful. Discovering components...`);

      const yamlFiles = await this.findYamlFiles(tempDir);
      this.logger.log(`Found ${yamlFiles.length} catalog-info.yaml files.`);

      let discoveredCount = 0;
      for (const file of yamlFiles) {
        try {
          const content = await fs.readFile(file, "utf-8");
          await this.registerYaml(content);
          discoveredCount++;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          this.logger.error(`Failed to process ${file}: ${message}`);
        }
      }
      return discoveredCount;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Discovery failed for ${url}: ${message}`, {
        context: CatalogService.name,
        error: message,
      });
      // Preserve typed HTTP exceptions from gitClone (e.g. InternalServerErrorException
      // when git binary is missing, BadRequestException when the URL is invalid).
      if (
        e instanceof BadRequestException ||
        e instanceof InternalServerErrorException
      ) {
        throw e;
      }
      throw new BadRequestException(`Discovery failed: ${message}`);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
      this.logger.log(`Cleaned up temporary directory: ${tempDir}`);
    }
  }

  /**
   * Validates that the provided Git URL/remotely-controlled value is safe to pass to git.
   * Rejects empty values, option-like values (starting with "-"), and disallowed URL schemes.
   * Allows HTTPS URLs and common SSH-style Git remotes (e.g., git@github.com:org/repo.git).
   */
  private validateGitUrl(url: string): void {
    const trimmed = url.trim();
    if (!trimmed) {
      throw new BadRequestException("Repository URL must not be empty.");
    }

    // Prevent git from interpreting the value as an option, such as --upload-pack
    if (trimmed.startsWith("-")) {
      throw new BadRequestException("Invalid repository URL.");
    }

    // If the value looks like a URL with a scheme, only allow http(s)
    if (trimmed.includes("://")) {
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        throw new BadRequestException("Invalid repository URL format.");
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new BadRequestException(
          "Only HTTP(S) repository URLs are allowed.",
        );
      }
      return;
    }

    // Allow common SSH-style Git remotes, e.g. git@github.com:org/repo.git
    const sshPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+:[^\s]+$/;
    if (sshPattern.test(trimmed)) {
      return;
    }

    throw new BadRequestException("Invalid repository URL.");
  }

  private async gitClone(url: string, targetDir: string): Promise<void> {
    // Normalize the URL once so validation and git both see the same value.
    const normalizedUrl = url.trim();

    // Validate the Git URL here to ensure all callers pass a safe value,
    // even if they forget to call validateGitUrl themselves.
    this.validateGitUrl(normalizedUrl);

    return new Promise((resolve, reject) => {
      const child = spawn("git", [
        "clone",
        "--depth",
        "1",
        "--",
        normalizedUrl,
        targetDir,
      ]);
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new BadRequestException(
              `git clone failed with exit code ${code} — check that the repository URL is accessible`,
            ),
          );
        }
      });
      child.on("error", (err) => {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          reject(
            new InternalServerErrorException(
              "git binary not found — ensure git is installed on the server",
            ),
          );
        } else {
          reject(err);
        }
      });
    });
  }

  private async findYamlFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return await this.findYamlFiles(fullPath);
        }
        if (entry.name === "catalog-info.yaml") {
          return fullPath;
        }
        return [];
      }),
    );
    return files.flat();
  }

  /**
   * Registers a component from a YAML string.
   * @param yamlContent - The raw YAML content
   * @returns The created component
   */
  async registerYaml(
    yamlContent: string,
    organizationId?: string,
  ): Promise<Component> {
    try {
      const parsed = yaml.load(yamlContent) as CatalogInfoYaml;

      if (!parsed || parsed.kind !== "Component") {
        throw new BadRequestException("Invalid YAML: missing kind: Component");
      }

      const dto: CreateComponentDto = {
        name: parsed.metadata?.name,
        description: parsed.metadata?.description,
        tags: parsed.metadata?.tags,
        kind: (parsed.spec?.type as ComponentKind) || ComponentKind.SERVICE,
        owner: parsed.spec?.owner,
        lifecycle:
          (parsed.spec?.lifecycle as ComponentLifecycle) ||
          ComponentLifecycle.EXPERIMENTAL,
        metadata: parsed.metadata || {},
        helmChart: parsed.spec?.helm
          ? {
              repo: parsed.spec.helm.repo,
              chart: parsed.spec.helm.chart,
              version: parsed.spec.helm.version,
              valuesRef: parsed.spec.helm.valuesRef,
            }
          : null,
      };

      if (!dto.name || !dto.owner) {
        throw new BadRequestException(
          "Invalid YAML: name and owner are required",
        );
      }

      return await this.create(dto, organizationId);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      const message = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`Failed to parse YAML: ${message}`);
    }
  }

  /**
   * Creates a new component and adds it to the catalog.
   * @param createComponentDto - Data for the component to create
   * @returns The newly created component
   */
  async create(
    createComponentDto: CreateComponentDto,
    organizationId?: string,
  ): Promise<Component> {
    const { dependencyIds, ...rest } = createComponentDto;
    const component = this.componentRepository.create({
      ...rest,
      ...(organizationId ? { organizationId } : {}),
    });

    if (dependencyIds?.length) {
      component.dependencies = await this.componentRepository.findBy({
        id: In(dependencyIds),
      });
    }

    const saved = await this.componentRepository.save(component);

    this.eventsGateway?.emitComponentCreated({
      id: saved.id,
      name: saved.name,
      kind: saved.kind,
      owner: saved.owner,
      timestamp: new Date().toISOString(),
    });

    this.eventEmitter?.emit("component.created", {
      id: saved.id,
      name: saved.name,
      kind: saved.kind,
      owner: saved.owner,
    });

    this.componentOperationsTotal?.inc({ operation: "create" });
    return saved;
  }

  /**
   * Retrieves all components from the catalog, optionally filtered by kind group, organization, or team.
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @param kindGroup - Optional kind group to filter components by domain
   * @param organizationId - Optional organization UUID to scope results
   * @param teamId - Optional team UUID to scope results
   * @returns A tuple of [components, total count]
   */
  async findAll(
    skip = 0,
    take = 20,
    kindGroup?: ComponentKindGroup,
    organizationId?: string,
    teamId?: string,
  ): Promise<[Component[], number]> {
    if (kindGroup) {
      const kinds = Object.entries(COMPONENT_KIND_GROUPS)
        .filter(([, group]) => group === kindGroup)
        .map(([kind]) => kind as ComponentKind);

      return await this.componentRepository.findAndCount({
        where: kinds.map((kind) => ({
          kind,
          ...(organizationId ? { organizationId } : {}),
          ...(teamId ? { teamId } : {}),
        })),
        relations: { dependencies: true },
        skip,
        take,
      });
    }

    return await this.componentRepository.findAndCount({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(teamId ? { teamId } : {}),
      },
      relations: { dependencies: true },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single component by its unique identifier, optionally scoped to an organization.
   * @param id - The UUID of the component to retrieve
   * @param organizationId - Optional organization UUID to scope the lookup
   * @returns The component with the specified ID
   * @throws NotFoundException if no component with the given ID exists (or belongs to another org)
   */
  async findOne(id: string, organizationId?: string): Promise<Component> {
    const where: FindOptionsWhere<Component> = { id };
    if (organizationId) where.organizationId = organizationId;
    const component = await this.componentRepository.findOne({
      where,
      relations: { dependencies: true },
    });
    if (!component) {
      throw new NotFoundException(`Component with ID "${id}" not found`);
    }
    return component;
  }

  /**
   * Updates an existing component's data.
   * @param id - The UUID of the component to update
   * @param updateComponentDto - Fields to update
   * @param organizationId - Optional organization UUID to scope the lookup
   * @returns The updated component
   * @throws NotFoundException if no component with the given ID exists (or belongs to another org)
   */
  async update(
    id: string,
    updateComponentDto: UpdateComponentDto,
    organizationId?: string,
  ): Promise<Component> {
    const component = await this.findOne(id, organizationId);
    const { dependencyIds, ...rest } = updateComponentDto;

    const updated = this.componentRepository.merge(component, rest);

    if (dependencyIds) {
      updated.dependencies = await this.componentRepository.findBy({
        id: In(dependencyIds),
      });
    }

    const saved = await this.componentRepository.save(updated);

    this.eventsGateway?.emitComponentUpdated({
      id: saved.id,
      name: saved.name,
      kind: saved.kind,
      owner: saved.owner,
      timestamp: new Date().toISOString(),
    });

    this.componentOperationsTotal?.inc({ operation: "update" });
    return saved;
  }

  /**
   * Removes a component from the catalog.
   * @param id - The UUID of the component to remove
   * @param organizationId - Optional organization UUID to scope the lookup
   * @throws NotFoundException if no component with the given ID exists (or belongs to another org)
   */
  async remove(id: string, organizationId?: string): Promise<void> {
    const component = await this.findOne(id, organizationId);
    await this.componentRepository.remove(component);

    this.eventsGateway?.emitComponentDeleted({
      id,
      name: component.name,
      timestamp: new Date().toISOString(),
    });

    this.componentOperationsTotal?.inc({ operation: "delete" });
  }

  /**
   * Sets or updates the container image metadata for a component.
   * @param id - The UUID of the component to update
   * @param dto - Container image metadata to set
   * @returns The updated component
   * @throws NotFoundException if no component with the given ID exists
   */
  async setContainerImage(
    id: string,
    dto: SetContainerImageDto,
  ): Promise<Component> {
    const component = await this.findOne(id);
    component.containerImage = {
      registry: dto.registry,
      image: dto.image,
      latestTag: dto.latestTag,
      digest: dto.digest,
      pushedAt: dto.pushedAt ? new Date(dto.pushedAt) : undefined,
    };
    return this.componentRepository.save(component);
  }

  /**
   * Syncs container image latestTag and digest from the configured registry adapter.
   * No-ops gracefully if no registry adapter is configured or no image is set.
   * @param id - The UUID of the component to sync
   * @returns The updated component
   * @throws NotFoundException if the component does not exist or has no containerImage set
   */
  async syncContainerImage(id: string): Promise<Component> {
    const component = await this.findOne(id);
    if (!component.containerImage) {
      throw new NotFoundException(
        `Component ${id} has no container image configured`,
      );
    }

    if (!this.registryService) {
      this.logger.warn(
        `No registry service available, skipping sync for component ${id}`,
      );
      return component;
    }

    try {
      const tags = await this.registryService.listTags(
        component.containerImage.image,
      );
      const latest = tags[0]; // first tag returned (most recent)
      if (latest) {
        component.containerImage = {
          ...component.containerImage,
          latestTag: latest.tag ?? component.containerImage.latestTag,
          digest: latest.digest ?? component.containerImage.digest,
          pushedAt: latest.pushedAt ?? component.containerImage.pushedAt,
        };
        await this.componentRepository.save(component);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Registry sync failed for component ${id}: ${msg}`);
    }

    return (await this.componentRepository.findOne({
      where: { id },
      relations: { dependencies: true },
    })) as Component;
  }

  /**
   * Returns all components that have a containerImage configured.
   * Used by the sync scheduler to build the job queue.
   * @returns Components with containerImage set
   */
  async findAllWithContainerImage(): Promise<Component[]> {
    return this.componentRepository
      .createQueryBuilder("c")
      .where("c.containerImage IS NOT NULL")
      .getMany();
  }
}
