import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import * as yaml from "js-yaml";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "./entities/component.entity";
import { CreateComponentDto } from "./dto/create-component.dto";
import { UpdateComponentDto } from "./dto/update-component.dto";

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
  ) {}

  /**
   * Clones a repository, discovers catalog-info.yaml files, and registers them.
   * @param url - The URL of the git repository
   * @returns The number of components discovered
   */
  async discoverFromLocation(url: string): Promise<number> {
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
      this.logger.error(`Discovery failed for ${url}: ${message}`);
      throw new BadRequestException(`Discovery failed: ${message}`);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
      this.logger.log(`Cleaned up temporary directory: ${tempDir}`);
    }
  }

  private async gitClone(url: string, targetDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn("git", ["clone", "--depth", "1", url, targetDir]);
      process.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`git clone failed with code ${code}`));
        }
      });
      process.on("error", (err) => reject(err));
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
  async registerYaml(yamlContent: string): Promise<Component> {
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
        metadata: (parsed.metadata as Record<string, unknown>) || {},
      };

      if (!dto.name || !dto.owner) {
        throw new BadRequestException(
          "Invalid YAML: name and owner are required",
        );
      }

      return await this.create(dto);
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
  async create(createComponentDto: CreateComponentDto): Promise<Component> {
    const { dependencyIds, ...rest } = createComponentDto;
    const component = this.componentRepository.create(rest);

    if (dependencyIds?.length) {
      component.dependencies = await this.componentRepository.findBy({
        id: In(dependencyIds),
      });
    }

    return await this.componentRepository.save(component);
  }

  /**
   * Retrieves all components from the catalog.
   * @returns An array of all registered components
   */
  async findAll(): Promise<Component[]> {
    return await this.componentRepository.find({
      relations: ["dependencies"],
    });
  }

  /**
   * Retrieves a single component by its unique identifier.
   * @param id - The UUID of the component to retrieve
   * @returns The component with the specified ID
   * @throws NotFoundException if no component with the given ID exists
   */
  async findOne(id: string): Promise<Component> {
    const component = await this.componentRepository.findOne({
      where: { id },
      relations: ["dependencies"],
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
   * @returns The updated component
   * @throws NotFoundException if no component with the given ID exists
   */
  async update(
    id: string,
    updateComponentDto: UpdateComponentDto,
  ): Promise<Component> {
    const component = await this.findOne(id);
    const { dependencyIds, ...rest } = updateComponentDto;

    const updated = this.componentRepository.merge(component, rest);

    if (dependencyIds) {
      updated.dependencies = await this.componentRepository.findBy({
        id: In(dependencyIds),
      });
    }

    return await this.componentRepository.save(updated);
  }

  /**
   * Removes a component from the catalog.
   * @param id - The UUID of the component to remove
   * @throws NotFoundException if no component with the given ID exists
   */
  async remove(id: string): Promise<void> {
    const component = await this.findOne(id);
    await this.componentRepository.remove(component);
  }
}
