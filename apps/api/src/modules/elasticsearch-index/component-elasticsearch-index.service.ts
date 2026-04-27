import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, QueryFailedError, Repository } from "typeorm";
import { ComponentElasticsearchIndex } from "./entities/component-elasticsearch-index.entity";
import { CreateComponentElasticsearchIndexDto } from "./dto/create-component-elasticsearch-index.dto";

/**
 * Result row produced by
 * {@link ComponentElasticsearchIndexService.findAllGroupedByComponent}.
 *
 * Represents one catalog component together with the Elasticsearch index
 * records that link to it.
 */
export interface ComponentIndexGroup {
  component: { id: string; name: string };
  records: ComponentElasticsearchIndex[];
}

/**
 * CRUD service for ComponentElasticsearchIndex (FARM-T401).
 *
 * Manages the link between catalog components and one or more
 * Elasticsearch index patterns.
 */
@Injectable()
export class ComponentElasticsearchIndexService {
  private readonly logger = new Logger(ComponentElasticsearchIndexService.name);

  constructor(
    @InjectRepository(ComponentElasticsearchIndex)
    private readonly repository: Repository<ComponentElasticsearchIndex>,
  ) {}

  /**
   * Returns all index patterns linked to a component, ordered by indexPattern.
   *
   * @param componentId - Catalog component UUID
   */
  async findByComponent(
    componentId: string,
  ): Promise<ComponentElasticsearchIndex[]> {
    return this.repository.find({
      where: { componentId },
      order: { indexPattern: "ASC" },
    });
  }

  /**
   * Returns every Elasticsearch index link in the system, grouped by their
   * owning catalog component (FARM-T407).
   *
   * Performs a single TypeORM query with a left join on `component` to avoid
   * the N+1 problem. Components without any linked index records are omitted.
   *
   * @param organizationId - When provided, restricts the result to records
   *                         whose `organizationId` matches. When `null` or
   *                         `undefined` (admin global view), no filter is
   *                         applied and records from every tenant are
   *                         returned.
   * @returns Groups sorted alphabetically by component name (case-insensitive),
   *          with records inside each group sorted ascending by index pattern.
   */
  async findAllGroupedByComponent(
    organizationId?: string | null,
  ): Promise<ComponentIndexGroup[]> {
    const where: FindOptionsWhere<ComponentElasticsearchIndex> | undefined =
      organizationId ? { organizationId } : undefined;

    const records = await this.repository.find({
      where,
      relations: ["component"],
      order: { indexPattern: "ASC" },
    });

    // Bucket records by componentId, keeping the first non-null component
    // payload encountered. Records whose component has been deleted (orphans)
    // are skipped to keep the response well-formed.
    const buckets = new Map<string, ComponentIndexGroup>();
    for (const record of records) {
      if (!record.component) {
        continue;
      }
      const existing = buckets.get(record.componentId);
      if (existing) {
        existing.records.push(record);
      } else {
        buckets.set(record.componentId, {
          component: {
            id: record.component.id,
            name: record.component.name,
          },
          records: [record],
        });
      }
    }

    const groups = Array.from(buckets.values());

    // Final deterministic ordering: groups by name (case-insensitive),
    // records inside each group by indexPattern ascending.
    groups.sort((a, b) =>
      a.component.name.localeCompare(b.component.name, undefined, {
        sensitivity: "base",
      }),
    );
    for (const group of groups) {
      group.records.sort((a, b) =>
        a.indexPattern.localeCompare(b.indexPattern),
      );
    }

    return groups;
  }

  /**
   * Links a new Elasticsearch index pattern to a component.
   *
   * @param componentId - Catalog component UUID
   * @param dto - Index link payload
   * @throws ConflictException when (componentId, indexPattern) already exists
   */
  async create(
    componentId: string,
    dto: CreateComponentElasticsearchIndexDto,
  ): Promise<ComponentElasticsearchIndex> {
    const existing = await this.repository.findOne({
      where: { componentId, indexPattern: dto.indexPattern },
    });
    if (existing) {
      throw new ConflictException(
        `Index pattern "${dto.indexPattern}" is already linked to component "${componentId}".`,
      );
    }

    const entity = this.repository.create({
      componentId,
      indexPattern: dto.indexPattern,
      esUrl: dto.esUrl ?? null,
      description: dto.description ?? null,
    });

    try {
      const saved = await this.repository.save(entity);
      this.logger.log(
        `Linked index "${saved.indexPattern}" to component "${componentId}"`,
      );
      return saved;
    } catch (error) {
      // Catch the unique-constraint race condition and surface a 409.
      if (error instanceof QueryFailedError) {
        const message = (error as QueryFailedError).message.toLowerCase();
        if (message.includes("unique") || message.includes("duplicate")) {
          throw new ConflictException(
            `Index pattern "${dto.indexPattern}" is already linked to component "${componentId}".`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Removes a single index link belonging to a specific component.
   *
   * @param componentId - Catalog component UUID
   * @param indexId - ComponentElasticsearchIndex UUID
   * @throws NotFoundException when the id does not exist or does not belong
   *         to the given component
   */
  async remove(componentId: string, indexId: string): Promise<void> {
    const entity = await this.repository.findOne({
      where: { id: indexId, componentId },
    });
    if (!entity) {
      throw new NotFoundException(
        `Elasticsearch index link "${indexId}" not found for component "${componentId}".`,
      );
    }
    await this.repository.remove(entity);
    this.logger.log(
      `Removed index link "${indexId}" from component "${componentId}"`,
    );
  }
}
