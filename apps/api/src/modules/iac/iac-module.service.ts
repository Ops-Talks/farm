import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { IacModule, IacEngine, IacProvider } from "./entities/iac-module.entity";
import { IacModuleVersion } from "./entities/iac-module-version.entity";
import { CreateIacModuleDto } from "./dto/create-iac-module.dto";
import { UpdateIacModuleDto } from "./dto/update-iac-module.dto";

export interface IacModuleListQuery {
  search?: string;
  provider?: IacProvider;
  engine?: IacEngine;
}

/**
 * Service responsible for IaC module catalog CRUD operations and
 * component link/unlink management.
 */
@Injectable()
export class IacModuleService {
  private readonly logger = new Logger(IacModuleService.name);

  constructor(
    @InjectRepository(IacModule)
    private readonly moduleRepository: Repository<IacModule>,
    @InjectRepository(IacModuleVersion)
    private readonly versionRepository: Repository<IacModuleVersion>,
  ) {}

  /**
   * Creates a new IaC module catalog entry.
   * Rejects duplicate names (case-insensitive) within the same provider.
   *
   * @param dto - Module creation payload
   * @returns The persisted IacModule record
   * @throws ConflictException when a module with the same name+provider exists
   */
  async create(dto: CreateIacModuleDto): Promise<IacModule> {
    const safeName = dto.name.replace(/[%_]/g, "\\$&");
    const existing = await this.moduleRepository.findOne({
      where: { name: ILike(safeName), provider: dto.provider },
    });
    if (existing) {
      throw new ConflictException(
        `An IaC module named "${dto.name}" for provider "${dto.provider}" already exists.`,
      );
    }

    const module = this.moduleRepository.create({
      name: dto.name,
      provider: dto.provider,
      engine: dto.engine ?? null,
      sourceRepoUrl: dto.sourceRepoUrl,
      description: dto.description ?? null,
      componentId: dto.componentId ?? null,
      latestVersion: null,
    });

    const saved = await this.moduleRepository.save(module);
    this.logger.log(`Created IacModule "${saved.name}" (${saved.provider})`);
    return saved;
  }

  /**
   * Returns a filtered list of IaC modules.
   *
   * @param query - Optional search string and/or provider filter
   * @returns Matching IacModule records ordered by name
   */
  async findAll(query: IacModuleListQuery = {}): Promise<IacModule[]> {
    const where: Record<string, unknown> = {};

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.engine) {
      where.engine = query.engine;
    }

    if (query.search) {
      where.name = ILike(`%${query.search}%`);
    }

    return this.moduleRepository.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { name: "ASC" },
    });
  }

  /**
   * Returns a single IaC module by ID.
   *
   * @param id - IacModule UUID
   * @returns The IacModule record
   * @throws NotFoundException when no record exists with the given ID
   */
  async findOne(id: string): Promise<IacModule> {
    const module = await this.moduleRepository.findOne({ where: { id } });
    if (!module) {
      throw new NotFoundException(`IaC module "${id}" not found.`);
    }
    return module;
  }

  /**
   * Returns all version records for a specific IaC module, ordered by
   * version descending, with an `isLatest` flag on each.
   *
   * @param moduleId - IacModule UUID
   * @returns Version records with isLatest flag
   */
  async findVersions(moduleId: string): Promise<(IacModuleVersion & { isLatest: boolean })[]> {
    const module = await this.findOne(moduleId);
    const versions = await this.versionRepository.find({
      where: { moduleId },
      order: { version: "DESC" },
    });

    return versions.map((v) => ({
      ...v,
      isLatest: v.version === module.latestVersion,
    }));
  }

  /**
   * Partially updates an existing IaC module.
   *
   * @param id - IacModule UUID
   * @param dto - Fields to update
   * @returns The updated IacModule record
   * @throws NotFoundException when no record exists with the given ID
   */
  async update(id: string, dto: UpdateIacModuleDto): Promise<IacModule> {
    const module = await this.findOne(id);

    if (dto.name !== undefined) module.name = dto.name;
    if (dto.provider !== undefined) module.provider = dto.provider;
    if (dto.engine !== undefined) module.engine = dto.engine ?? null;
    if (dto.sourceRepoUrl !== undefined) module.sourceRepoUrl = dto.sourceRepoUrl;
    if (dto.description !== undefined) module.description = dto.description ?? null;
    if (dto.componentId !== undefined) module.componentId = dto.componentId ?? null;

    const updated = await this.moduleRepository.save(module);
    this.logger.log(`Updated IacModule "${updated.id}"`);
    return updated;
  }

  /**
   * Deletes an IaC module and all its version records (cascade).
   *
   * @param id - IacModule UUID
   * @throws NotFoundException when no record exists with the given ID
   */
  async remove(id: string): Promise<void> {
    const module = await this.findOne(id);
    await this.moduleRepository.remove(module);
    this.logger.log(`Deleted IacModule "${id}"`);
  }

  /**
   * Associates an IaC module with a catalog component.
   *
   * @param id - IacModule UUID
   * @param componentId - Catalog component UUID
   * @returns The updated IacModule record
   */
  async linkComponent(id: string, componentId: string): Promise<IacModule> {
    const module = await this.findOne(id);
    module.componentId = componentId;
    const updated = await this.moduleRepository.save(module);
    this.logger.log(`Linked IacModule "${id}" to component "${componentId}"`);
    return updated;
  }

  /**
   * Removes the component association from an IaC module.
   *
   * @param id - IacModule UUID
   * @returns The updated IacModule record
   */
  async unlinkComponent(id: string): Promise<IacModule> {
    const module = await this.findOne(id);
    module.componentId = null;
    const updated = await this.moduleRepository.save(module);
    this.logger.log(`Unlinked IacModule "${id}" from component`);
    return updated;
  }

  /**
   * Returns all IaC modules linked to a specific catalog component.
   *
   * @param componentId - Catalog component UUID
   * @returns Matching IacModule records ordered by name
   */
  async getModulesByComponent(componentId: string): Promise<IacModule[]> {
    return this.moduleRepository.find({
      where: { componentId },
      order: { name: "ASC" },
    });
  }
}
