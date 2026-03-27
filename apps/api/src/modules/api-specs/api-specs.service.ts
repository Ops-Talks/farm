import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventsGateway } from "../../common/events/events.gateway";
import { FarmEvent } from "../../common/events/events.interfaces";
import { ApiSpec } from "./entities/api-spec.entity";
import { ApiConsumer } from "./entities/api-consumer.entity";
import { ApiSpecStatus } from "./enums/api-spec-status.enum";
import { CreateApiSpecDto } from "./dto/create-api-spec.dto";
import { UpdateApiSpecDto } from "./dto/update-api-spec.dto";
import { AddConsumerDto } from "./dto/add-consumer.dto";
import { SpecDiffService, SpecDiffResult } from "./spec-diff.service";

/**
 * Service responsible for managing API catalog entries, consumer registrations,
 * and spec diffs.
 */
@Injectable()
export class ApiSpecsService {
  private readonly logger = new Logger(ApiSpecsService.name);

  constructor(
    @InjectRepository(ApiSpec)
    private readonly apiSpecRepo: Repository<ApiSpec>,
    @InjectRepository(ApiConsumer)
    private readonly apiConsumerRepo: Repository<ApiConsumer>,
    private readonly eventsGateway: EventsGateway,
    private readonly specDiffService: SpecDiffService,
  ) {}

  /**
   * Creates a new API spec associated with the given component.
   *
   * @param componentId - UUID of the owning catalog component
   * @param dto - Creation payload
   * @returns The persisted API spec
   */
  async create(componentId: string, dto: CreateApiSpecDto): Promise<ApiSpec> {
    const entity = this.apiSpecRepo.create({ ...dto, componentId });
    const saved = await this.apiSpecRepo.save(entity);
    this.logger.log(
      `Created API spec ${saved.id} (${saved.name}) for component ${componentId}`,
    );
    return saved;
  }

  /**
   * Returns all API specs belonging to a component, ordered by creation date
   * descending.
   *
   * @param componentId - UUID of the catalog component
   */
  async findAllByComponent(componentId: string): Promise<ApiSpec[]> {
    return this.apiSpecRepo.find({
      where: { componentId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Returns a single API spec by its UUID.
   *
   * @param id - UUID of the API spec
   * @throws NotFoundException when no spec is found
   */
  async findOne(id: string): Promise<ApiSpec> {
    const spec = await this.apiSpecRepo.findOne({ where: { id } });
    if (!spec) {
      throw new NotFoundException(`API spec ${id} not found`);
    }
    return spec;
  }

  /**
   * Updates an existing API spec. Automatically sets deprecatedAt when the
   * status transitions to DEPRECATED without an explicit timestamp.
   * Emits a WebSocket event when the spec becomes deprecated.
   *
   * @param id - UUID of the API spec
   * @param dto - Update payload
   * @returns The updated API spec
   */
  async update(id: string, dto: UpdateApiSpecDto): Promise<ApiSpec> {
    const spec = await this.findOne(id);

    if (dto.status !== undefined) {
      spec.status = dto.status;
    }

    if (dto.sunsetAt !== undefined) {
      spec.sunsetAt = new Date(dto.sunsetAt);
    }

    if (dto.deprecatedAt !== undefined) {
      spec.deprecatedAt = new Date(dto.deprecatedAt);
    }

    if (spec.status === ApiSpecStatus.DEPRECATED && !spec.deprecatedAt) {
      spec.deprecatedAt = new Date();
    }

    const saved = await this.apiSpecRepo.save(spec);

    if (saved.status === ApiSpecStatus.DEPRECATED) {
      this.eventsGateway.server?.emit(FarmEvent.API_SPEC_DEPRECATED, {
        id: saved.id,
        name: saved.name,
        componentId: saved.componentId,
        deprecatedAt: saved.deprecatedAt?.toISOString() ?? null,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`API spec ${saved.id} marked as deprecated`);
    }

    return saved;
  }

  /**
   * Deletes an API spec by its UUID.
   *
   * @param id - UUID of the API spec
   * @throws NotFoundException when no spec is found
   */
  async remove(id: string): Promise<void> {
    const spec = await this.findOne(id);
    await this.apiSpecRepo.remove(spec);
    this.logger.log(`Deleted API spec ${id}`);
  }

  /**
   * Computes a structural diff between two API specs.
   *
   * @param id - UUID of the baseline spec
   * @param compareWithId - UUID of the spec to compare against
   * @returns Structured diff result
   * @throws NotFoundException when either spec is missing
   */
  async diff(id: string, compareWithId: string): Promise<SpecDiffResult> {
    const [baseSpec, compareSpec] = await Promise.all([
      this.findOne(id),
      this.findOne(compareWithId),
    ]);
    return this.specDiffService.diff(baseSpec.spec, compareSpec.spec);
  }

  /**
   * Registers a consumer for an API spec.
   *
   * @param apiSpecId - UUID of the target API spec
   * @param dto - Consumer registration payload
   * @returns The persisted consumer record
   * @throws ConflictException when the consumer pair already exists
   */
  async addConsumer(
    apiSpecId: string,
    dto: AddConsumerDto,
  ): Promise<ApiConsumer> {
    if (!dto.consumerComponentId && !dto.consumerTeamId) {
      throw new ConflictException(
        "At least one of consumerComponentId or consumerTeamId must be provided",
      );
    }

    const entity = this.apiConsumerRepo.create({
      apiSpecId,
      consumerComponentId: dto.consumerComponentId ?? null,
      consumerTeamId: dto.consumerTeamId ?? null,
    });

    try {
      const saved = await this.apiConsumerRepo.save(entity);
      this.logger.log(
        `Registered consumer ${saved.id} for API spec ${apiSpecId}`,
      );
      return saved;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown database error";
      if (
        message.includes("unique") ||
        message.includes("UNIQUE") ||
        message.includes("duplicate") ||
        message.includes("DUPLICATE")
      ) {
        throw new ConflictException(
          "This consumer is already registered for the API spec",
        );
      }
      throw err;
    }
  }

  /**
   * Removes a consumer registration.
   *
   * @param apiSpecId - UUID of the target API spec
   * @param consumerId - UUID of the consumer record
   * @throws NotFoundException when the consumer record does not exist
   */
  async removeConsumer(apiSpecId: string, consumerId: string): Promise<void> {
    const consumer = await this.apiConsumerRepo.findOne({
      where: { id: consumerId, apiSpecId },
    });
    if (!consumer) {
      throw new NotFoundException(
        `Consumer ${consumerId} not found for API spec ${apiSpecId}`,
      );
    }
    await this.apiConsumerRepo.remove(consumer);
    this.logger.log(
      `Removed consumer ${consumerId} from API spec ${apiSpecId}`,
    );
  }

  /**
   * Returns the distinct set of API specs consumed by a component.
   *
   * @param componentId - UUID of the consuming component
   * @returns Array of consumed API specs
   */
  async findConsumedApis(componentId: string): Promise<ApiSpec[]> {
    const consumers = await this.apiConsumerRepo.find({
      where: { consumerComponentId: componentId },
      relations: ["apiSpec"],
    });

    const seen = new Set<string>();
    const specs: ApiSpec[] = [];
    for (const consumer of consumers) {
      if (consumer.apiSpec && !seen.has(consumer.apiSpec.id)) {
        seen.add(consumer.apiSpec.id);
        specs.push(consumer.apiSpec);
      }
    }
    return specs;
  }
}
