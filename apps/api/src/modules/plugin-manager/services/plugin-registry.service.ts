import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { PluginRegistryEntry } from "../entities/plugin-registry-entry.entity";
import { PluginManifestV2 } from "../interfaces/plugin-manifest-v2.interface";
import { PluginValidatorService } from "./plugin-validator.service";
import { BadRequestException } from "@nestjs/common";

/**
 * Manages the community plugin registry: publishing, searching, and
 * retrieving plugin entries backed by the database.
 */
@Injectable()
export class PluginRegistryService {
  private readonly logger = new Logger(PluginRegistryService.name);

  constructor(
    @InjectRepository(PluginRegistryEntry)
    private readonly registryRepo: Repository<PluginRegistryEntry>,
    private readonly validator: PluginValidatorService,
  ) {}

  /**
   * Searches the registry by name and description using case-insensitive
   * matching. Optionally filters by category.
   *
   * @param query Optional search string matched against name and description
   * @param category Optional category filter
   * @returns Array of matching PluginRegistryEntry records
   */
  async search(
    query?: string,
    category?: string,
  ): Promise<PluginRegistryEntry[]> {
    const qb = this.registryRepo.createQueryBuilder("entry");

    if (query) {
      qb.andWhere(
        "(entry.name ILIKE :q OR entry.description ILIKE :q)",
        { q: `%${query}%` },
      );
    }

    if (category) {
      qb.andWhere("entry.category = :category", { category });
    }

    return qb.getMany();
  }

  /**
   * Validates and publishes (upserts) a manifest v2 into the registry.
   * If a record with the same pluginId already exists it is updated with the
   * new version and manifest; otherwise a new entry is created.
   *
   * @param manifest The v2 manifest to publish
   * @returns The created or updated PluginRegistryEntry
   */
  async publish(manifest: PluginManifestV2): Promise<PluginRegistryEntry> {
    const result = this.validator.validate(manifest);
    if (!result.valid) {
      throw new BadRequestException(
        `Invalid manifest: ${result.errors.join("; ")}`,
      );
    }

    const existing = await this.registryRepo.findOne({
      where: { pluginId: manifest.id },
    });

    if (existing) {
      await this.registryRepo.update(existing.id, {
        name: manifest.name,
        latestVersion: manifest.version,
        description: manifest.description,
        author: manifest.author ?? null,
        category: (manifest as PublishManifestWithCategory).category ?? null,
        manifest: manifest as unknown as Record<string, unknown>,
      });
      this.logger.log(
        `Plugin "${manifest.id}" updated to v${manifest.version}`,
      );
      return this.registryRepo.findOne({
        where: { id: existing.id },
      }) as Promise<PluginRegistryEntry>;
    }

    const entry = this.registryRepo.create({
      pluginId: manifest.id,
      name: manifest.name,
      latestVersion: manifest.version,
      description: manifest.description,
      author: manifest.author ?? null,
      category: (manifest as PublishManifestWithCategory).category ?? null,
      manifest: manifest as unknown as Record<string, unknown>,
      installCount: 0,
    });

    const saved = await this.registryRepo.save(entry);
    this.logger.log(`Plugin "${manifest.id}" published at v${manifest.version}`);
    return saved;
  }

  /**
   * Returns a single registry entry by its pluginId.
   * Throws NotFoundException when the plugin is not in the registry.
   *
   * @param pluginId The unique plugin identifier
   * @returns The PluginRegistryEntry
   */
  async findOne(pluginId: string): Promise<PluginRegistryEntry> {
    const entry = await this.registryRepo.findOne({ where: { pluginId } });
    if (!entry) {
      throw new NotFoundException(
        `Plugin "${pluginId}" not found in the registry`,
      );
    }
    return entry;
  }

  /**
   * Returns an array of known version strings for a plugin.
   * Currently returns the latestVersion only; this can be extended to a
   * dedicated versions table in a future iteration.
   *
   * @param pluginId The unique plugin identifier
   * @returns Array of version strings
   */
  async getVersions(pluginId: string): Promise<string[]> {
    const entry = await this.findOne(pluginId);
    return [entry.latestVersion];
  }

  /**
   * Increments the install count for a registry entry.
   *
   * @param pluginId The unique plugin identifier
   */
  async incrementInstallCount(pluginId: string): Promise<void> {
    await this.findOne(pluginId);
    await this.registryRepo.increment({ pluginId }, "installCount", 1);
  }
}

/**
 * Internal extension type that carries the optional category field
 * accepted in the publish DTO but not defined on the core manifest interface.
 */
interface PublishManifestWithCategory extends PluginManifestV2 {
  category?: string;
}
