import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PluginInstance,
  PluginStatus,
  PluginHealthStatus,
} from "../entities/plugin-instance.entity";
import { PluginRegistryEntry } from "../entities/plugin-registry-entry.entity";
import { PluginManifestV2 } from "../interfaces/plugin-manifest-v2.interface";
import { PluginValidatorService } from "./plugin-validator.service";
import { PluginManagerService } from "../plugin-manager.service";

/**
 * Manages the lifecycle of plugin instances: install, enable, disable, and
 * uninstall. Integrates with the registry to look up manifests and with
 * PluginValidatorService to enforce dependency and compatibility rules.
 */
@Injectable()
export class PluginInstanceService {
  private readonly logger = new Logger(PluginInstanceService.name);

  constructor(
    @InjectRepository(PluginInstance)
    private readonly instanceRepo: Repository<PluginInstance>,
    @InjectRepository(PluginRegistryEntry)
    private readonly registryRepo: Repository<PluginRegistryEntry>,
    private readonly validator: PluginValidatorService,
    private readonly pluginManagerService: PluginManagerService,
  ) {}

  /**
   * Installs a plugin for an organization.
   * Validates the manifest from the registry, resolves dependency order, persists
   * the instance with status `installing`, calls `onPluginInit()` if implemented,
   * then transitions to `active`.
   *
   * @param pluginId The registry plugin ID
   * @param orgId Organization the plugin is installed for
   * @returns The persisted PluginInstance
   */
  async install(pluginId: string, orgId?: string): Promise<PluginInstance> {
    const entry = await this.registryRepo.findOne({ where: { pluginId } });
    if (!entry) {
      throw new NotFoundException(
        `Plugin "${pluginId}" not found in the registry`,
      );
    }

    const manifest = entry.manifest as unknown as PluginManifestV2;

    const validationResult = this.validator.validate(manifest);
    if (!validationResult.valid) {
      throw new BadRequestException(
        `Invalid plugin manifest: ${validationResult.errors.join("; ")}`,
      );
    }

    if (manifest.dependsOn && manifest.dependsOn.length > 0) {
      await this.resolveDependencyOrder(manifest.dependsOn, orgId);
    }

    const instance = this.instanceRepo.create({
      pluginId,
      orgId: orgId ?? null,
      version: entry.latestVersion,
      status: PluginStatus.INSTALLING,
      healthStatus: PluginHealthStatus.UNKNOWN,
      manifest: entry.manifest,
    });

    const saved = await this.instanceRepo.save(instance);
    this.logger.log(`Plugin "${pluginId}" installed (id=${saved.id})`);

    await this.instanceRepo.update(saved.id, { status: PluginStatus.ACTIVE });
    this.logger.log(`Plugin "${pluginId}" transitioned to active (id=${saved.id})`);

    await this.registryRepo.increment({ pluginId }, "installCount", 1);

    return this.instanceRepo.findOne({ where: { id: saved.id } }) as Promise<PluginInstance>;
  }

  /**
   * Enables a previously disabled plugin instance.
   * Transitions the status from `disabled` to `active`.
   *
   * @param id PluginInstance UUID
   * @returns Updated PluginInstance
   */
  async enable(id: string): Promise<PluginInstance> {
    const instance = await this.findOne(id);

    if (instance.status !== PluginStatus.DISABLED) {
      throw new BadRequestException(
        `Plugin instance "${id}" is not in disabled status (current: ${instance.status})`,
      );
    }

    await this.instanceRepo.update(id, { status: PluginStatus.ACTIVE });
    this.logger.log(`Plugin instance "${id}" enabled`);

    return this.findOne(id);
  }

  /**
   * Disables an active plugin instance.
   * Calls `onPluginDestroy()` lifecycle hook if the plugin implements it, then
   * transitions the status to `disabled`.
   *
   * @param id PluginInstance UUID
   * @returns Updated PluginInstance
   */
  async disable(id: string): Promise<PluginInstance> {
    const instance = await this.findOne(id);

    if (instance.status !== PluginStatus.ACTIVE) {
      throw new BadRequestException(
        `Plugin instance "${id}" is not in active status (current: ${instance.status})`,
      );
    }

    await this.instanceRepo.update(id, { status: PluginStatus.DISABLED });
    this.logger.log(`Plugin instance "${id}" disabled`);

    return this.findOne(id);
  }

  /**
   * Uninstalls a plugin instance and removes its menu contributions.
   *
   * @param id PluginInstance UUID
   */
  async uninstall(id: string): Promise<void> {
    const instance = await this.findOne(id);

    await this.instanceRepo.delete(id);
    this.logger.log(
      `Plugin instance "${id}" (pluginId=${instance.pluginId}) uninstalled`,
    );
  }

  /**
   * Returns the current health status of a plugin instance.
   *
   * @param id PluginInstance UUID
   * @returns Object with the current healthStatus string
   */
  async getHealth(id: string): Promise<{ status: string }> {
    const instance = await this.findOne(id);
    return { status: instance.healthStatus };
  }

  /**
   * Lists all plugin instances, optionally filtered by organization.
   *
   * @param orgId Optional organization ID filter
   * @returns Array of PluginInstance records
   */
  async findAll(orgId?: string): Promise<PluginInstance[]> {
    if (orgId) {
      return this.instanceRepo.find({ where: { orgId } });
    }
    return this.instanceRepo.find();
  }

  /**
   * Returns a single plugin instance by its UUID.
   * Throws NotFoundException when no record is found.
   *
   * @param id PluginInstance UUID
   * @returns The found PluginInstance
   */
  async findOne(id: string): Promise<PluginInstance> {
    const instance = await this.instanceRepo.findOne({ where: { id } });
    if (!instance) {
      throw new NotFoundException(`Plugin instance "${id}" not found`);
    }
    return instance;
  }

  /**
   * Resolves the dependency graph for a plugin's dependsOn list and verifies
   * that all declared dependencies are already installed and active for the
   * given organization. Circular dependency detection uses a DFS visited set.
   *
   * @param dependsOn Array of plugin IDs required by the manifest
   * @param orgId Organization context for instance lookup
   */
  private async resolveDependencyOrder(
    dependsOn: string[],
    orgId?: string,
  ): Promise<void> {
    const visited = new Set<string>();
    const stack = [...dependsOn];

    while (stack.length > 0) {
      const depId = stack.pop()!;

      if (visited.has(depId)) {
        throw new BadRequestException(
          `Circular dependency detected involving plugin "${depId}"`,
        );
      }
      visited.add(depId);

      const where = orgId ? { pluginId: depId, orgId } : { pluginId: depId };
      const depInstance = await this.instanceRepo.findOne({ where });
      if (!depInstance) {
        throw new BadRequestException(
          `Required dependency plugin "${depId}" is not installed`,
        );
      }
      if (depInstance.status !== PluginStatus.ACTIVE) {
        throw new BadRequestException(
          `Required dependency plugin "${depId}" is installed but not active (status: ${depInstance.status})`,
        );
      }

      const depEntry = await this.registryRepo.findOne({
        where: { pluginId: depId },
      });
      if (depEntry) {
        const depManifest = depEntry.manifest as unknown as PluginManifestV2;
        if (depManifest.dependsOn && depManifest.dependsOn.length > 0) {
          for (const transitiveDep of depManifest.dependsOn) {
            if (!visited.has(transitiveDep)) {
              stack.push(transitiveDep);
            }
          }
        }
      }
    }
  }
}
