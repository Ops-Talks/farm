import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { Slo } from "./entities/slo.entity";
import { CreateSloDto } from "./dto/create-slo.dto";
import { UpdateSloDto } from "./dto/update-slo.dto";
import { ListSlosQueryDto } from "./dto/list-slos-query.dto";

/**
 * Service responsible for managing Service Level Objectives.
 */
@Injectable()
export class SloService {
  private readonly logger = new Logger(SloService.name);

  constructor(
    @InjectRepository(Slo)
    private readonly sloRepository: Repository<Slo>,
  ) {}

  /**
   * Creates a new SLO.
   * @param createSloDto - Data for the new SLO
   * @returns The created SLO
   * @throws ConflictException if an SLO with the same name already exists
   */
  async create(createSloDto: CreateSloDto): Promise<Slo> {
    const existing = await this.sloRepository.findOne({
      where: { name: createSloDto.name },
    });
    if (existing) {
      throw new ConflictException(
        `SLO with name "${createSloDto.name}" already exists`,
      );
    }

    const slo = this.sloRepository.create(createSloDto);
    this.logger.log(`Creating SLO: ${createSloDto.name}`);
    return await this.sloRepository.save(slo);
  }

  /**
   * Retrieves SLOs with optional filters and pagination.
   * @param query - Optional filter and pagination parameters
   * @returns A tuple of [slos, total count]
   */
  async findAll(query: ListSlosQueryDto): Promise<[Slo[], number]> {
    const {
      componentId,
      metricType,
      window,
      organizationId,
      enabled,
      skip = 0,
      take = 20,
    } = query;

    const where: FindOptionsWhere<Slo> = {};

    if (componentId !== undefined) where.componentId = componentId;
    if (metricType !== undefined) where.metricType = metricType;
    if (window !== undefined) where.window = window;
    if (organizationId !== undefined) where.organizationId = organizationId;
    if (enabled !== undefined) where.enabled = enabled;

    return await this.sloRepository.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single SLO by ID.
   * @param id - The UUID of the SLO
   * @returns The SLO with the specified ID
   * @throws NotFoundException if no SLO with the given ID exists
   */
  async findOne(id: string): Promise<Slo> {
    const slo = await this.sloRepository.findOne({ where: { id } });
    if (!slo) {
      throw new NotFoundException(`SLO with ID "${id}" not found`);
    }
    return slo;
  }

  /**
   * Updates an existing SLO.
   * @param id - The UUID of the SLO to update
   * @param updateSloDto - Fields to update
   * @returns The updated SLO
   * @throws NotFoundException if no SLO with the given ID exists
   * @throws ConflictException if the new name conflicts with an existing SLO
   */
  async update(id: string, updateSloDto: UpdateSloDto): Promise<Slo> {
    const slo = await this.findOne(id);

    if (updateSloDto.name && updateSloDto.name !== slo.name) {
      const existing = await this.sloRepository.findOne({
        where: { name: updateSloDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `SLO with name "${updateSloDto.name}" already exists`,
        );
      }
    }

    const updated = this.sloRepository.merge(slo, updateSloDto);
    this.logger.log(`Updating SLO: ${slo.name}`);
    return await this.sloRepository.save(updated);
  }

  /**
   * Removes an SLO.
   * @param id - The UUID of the SLO to remove
   * @throws NotFoundException if no SLO with the given ID exists
   */
  async remove(id: string): Promise<void> {
    const slo = await this.findOne(id);
    await this.sloRepository.remove(slo);
    this.logger.log(`Removed SLO: ${slo.name}`);
  }
}
