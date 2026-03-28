import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Environment } from "./entities/environment.entity";
import { CreateEnvironmentDto } from "./dto/create-environment.dto";
import { UpdateEnvironmentDto } from "./dto/update-environment.dto";

/**
 * Service responsible for managing deployment environments.
 */
@Injectable()
export class EnvironmentsService {
  private readonly logger = new Logger(EnvironmentsService.name);

  constructor(
    @InjectRepository(Environment)
    private readonly environmentRepository: Repository<Environment>,
  ) {}

  /**
   * Creates a new environment.
   * @param createEnvironmentDto - Data for the environment to create
   * @returns The newly created environment
   * @throws ConflictException if an environment with the same name already exists
   */
  async create(
    createEnvironmentDto: CreateEnvironmentDto,
    organizationId?: string,
  ): Promise<Environment> {
    const existing = await this.environmentRepository.findOne({
      where: { name: createEnvironmentDto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Environment with name "${createEnvironmentDto.name}" already exists`,
      );
    }

    const environment = this.environmentRepository.create({
      ...createEnvironmentDto,
      ...(organizationId ? { organizationId } : {}),
    });
    this.logger.log(`Creating environment: ${createEnvironmentDto.name}`);
    return await this.environmentRepository.save(environment);
  }

  /**
   * Retrieves all environments ordered by the order field, optionally scoped to an organization.
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @param organizationId - Optional organization UUID to scope results
   * @returns A tuple of [environments, total count]
   */
  async findAll(
    skip = 0,
    take = 20,
    organizationId?: string,
  ): Promise<[Environment[], number]> {
    return await this.environmentRepository.findAndCount({
      where: organizationId ? { organizationId } : {},
      order: { order: "ASC", name: "ASC" },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single environment by its unique identifier.
   * @param id - The UUID of the environment
   * @returns The environment with the specified ID
   * @throws NotFoundException if no environment with the given ID exists
   */
  async findOne(id: string): Promise<Environment> {
    const environment = await this.environmentRepository.findOne({
      where: { id },
    });
    if (!environment) {
      throw new NotFoundException(`Environment with ID "${id}" not found`);
    }
    return environment;
  }

  /**
   * Updates an existing environment.
   * @param id - The UUID of the environment to update
   * @param updateEnvironmentDto - Fields to update
   * @returns The updated environment
   * @throws NotFoundException if no environment with the given ID exists
   * @throws ConflictException if the new name conflicts with an existing environment
   */
  async update(
    id: string,
    updateEnvironmentDto: UpdateEnvironmentDto,
  ): Promise<Environment> {
    const environment = await this.findOne(id);

    if (
      updateEnvironmentDto.name &&
      updateEnvironmentDto.name !== environment.name
    ) {
      const existing = await this.environmentRepository.findOne({
        where: { name: updateEnvironmentDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Environment with name "${updateEnvironmentDto.name}" already exists`,
        );
      }
    }

    const updated = this.environmentRepository.merge(
      environment,
      updateEnvironmentDto,
    );
    return await this.environmentRepository.save(updated);
  }

  /**
   * Removes an environment.
   * @param id - The UUID of the environment to remove
   * @throws NotFoundException if no environment with the given ID exists
   */
  async remove(id: string): Promise<void> {
    const environment = await this.findOne(id);
    await this.environmentRepository.remove(environment);
    this.logger.log(`Removed environment: ${environment.name}`);
  }
}
