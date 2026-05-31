import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { KedaBinding } from "./entities/keda-binding.entity";
import { CreateKedaBindingDto } from "./dto/create-keda-binding.dto";

/**
 * Service for managing KEDA ScaledObject-to-component bindings.
 * Provides CRUD operations to link KEDA ScaledObjects to catalog components.
 */
@Injectable()
export class KedaBindingService {
  private readonly logger = new Logger(KedaBindingService.name);

  constructor(
    @InjectRepository(KedaBinding)
    private readonly bindingRepository: Repository<KedaBinding>,
  ) {}

  /**
   * Creates a new KEDA ScaledObject-to-component binding.
   *
   * @param dto - Data for the new binding
   * @returns The persisted KedaBinding entity
   * @throws ConflictException if a binding with the same ScaledObject name,
   *         namespace, and component already exists
   */
  async create(dto: CreateKedaBindingDto): Promise<KedaBinding> {
    const existing = await this.bindingRepository.findOne({
      where: {
        scaledObjectName: dto.scaledObjectName,
        scaledObjectNamespace: dto.scaledObjectNamespace,
        componentId: dto.componentId,
        ...(dto.organizationId ? { organizationId: dto.organizationId } : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Binding already exists for ScaledObject "${dto.scaledObjectName}" in namespace "${dto.scaledObjectNamespace}" with component "${dto.componentId}"`,
      );
    }

    const binding = this.bindingRepository.create(dto);
    const saved = await this.bindingRepository.save(binding);

    this.logger.log(
      `Created KEDA binding: scaledObject="${dto.scaledObjectName}" namespace="${dto.scaledObjectNamespace}" component="${dto.componentId}"`,
    );

    return saved;
  }

  /**
   * Finds all bindings for a given ScaledObject, optionally scoped to an organization.
   *
   * @param scaledObjectName - The ScaledObject name to search for
   * @param scaledObjectNamespace - The Kubernetes namespace of the ScaledObject
   * @param organizationId - Optional organization UUID to scope the query
   * @returns Array of matching KedaBinding entities with their component relations
   */
  async findByScaledObject(
    scaledObjectName: string,
    scaledObjectNamespace: string,
    organizationId?: string,
  ): Promise<KedaBinding[]> {
    const where: Record<string, unknown> = {
      scaledObjectName,
      scaledObjectNamespace,
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.bindingRepository.find({
      where,
      relations: { component: true },
    });
  }

  /**
   * Finds all bindings linked to a specific catalog component.
   *
   * @param componentId - The component UUID to search for
   * @param organizationId - Optional organization UUID to scope the query
   * @returns Array of matching KedaBinding entities with their component relations
   */
  async findByComponent(
    componentId: string,
    organizationId?: string,
  ): Promise<KedaBinding[]> {
    const where: Record<string, unknown> = { componentId };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.bindingRepository.find({
      where,
      relations: { component: true },
    });
  }

  /**
   * Removes a KEDA binding by its UUID, optionally scoped to an organization.
   * Returns NotFoundException when the binding does not exist or does not
   * belong to the given organization (to prevent information disclosure).
   *
   * @param id - The binding UUID to remove
   * @param organizationId - Optional org UUID; when provided, the binding must
   *                         belong to this org or the removal is rejected
   * @throws NotFoundException if no binding with the given id exists, or if
   *         the binding's org does not match the provided org
   */
  async remove(id: string, organizationId?: string): Promise<void> {
    const binding = await this.bindingRepository.findOne({ where: { id } });

    if (!binding) {
      throw new NotFoundException(`KEDA binding with id "${id}" not found`);
    }

    if (
      organizationId &&
      binding.organizationId &&
      binding.organizationId !== organizationId
    ) {
      throw new NotFoundException(`KEDA binding with id "${id}" not found`);
    }

    await this.bindingRepository.remove(binding);

    this.logger.log(
      `Removed KEDA binding: id="${id}" scaledObject="${binding.scaledObjectName}" namespace="${binding.scaledObjectNamespace}"`,
    );
  }
}
