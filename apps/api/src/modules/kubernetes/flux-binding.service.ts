import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FluxBinding } from "./entities/flux-binding.entity";
import { CreateFluxBindingDto } from "./dto/create-flux-binding.dto";

/**
 * Service for managing Flux-resource-to-component bindings.
 * Provides CRUD operations to link Flux Kustomizations and HelmReleases
 * to catalog components.
 */
@Injectable()
export class FluxBindingService {
  private readonly logger = new Logger(FluxBindingService.name);

  constructor(
    @InjectRepository(FluxBinding)
    private readonly bindingRepository: Repository<FluxBinding>,
  ) {}

  /**
   * Creates a new Flux-resource-to-component binding.
   *
   * @param dto - Data for the new binding
   * @returns The persisted FluxBinding entity
   * @throws ConflictException if a binding with the same resource kind,
   *         name, namespace, and component already exists
   */
  async create(dto: CreateFluxBindingDto): Promise<FluxBinding> {
    const existing = await this.bindingRepository.findOne({
      where: {
        resourceKind: dto.resourceKind,
        resourceName: dto.resourceName,
        resourceNamespace: dto.resourceNamespace,
        componentId: dto.componentId,
        ...(dto.organizationId ? { organizationId: dto.organizationId } : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Binding already exists for ${dto.resourceKind} "${dto.resourceName}" in namespace "${dto.resourceNamespace}" with component "${dto.componentId}"`,
      );
    }

    const binding = this.bindingRepository.create(dto);
    const saved = await this.bindingRepository.save(binding);

    this.logger.log(
      `Created binding: ${dto.resourceKind}="${dto.resourceName}" namespace="${dto.resourceNamespace}" component="${dto.componentId}"`,
    );

    return saved;
  }

  /**
   * Finds all bindings for a given Flux resource, optionally scoped to an
   * organization.
   *
   * @param resourceKind - "Kustomization" or "HelmRelease"
   * @param resourceName - The resource name
   * @param resourceNamespace - The Kubernetes namespace
   * @param organizationId - Optional organization UUID to scope the query
   * @returns Array of matching FluxBinding entities with their component relations
   */
  async findByResource(
    resourceKind: "Kustomization" | "HelmRelease",
    resourceName: string,
    resourceNamespace: string,
    organizationId?: string,
  ): Promise<FluxBinding[]> {
    const where: Record<string, unknown> = {
      resourceKind,
      resourceName,
      resourceNamespace,
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.bindingRepository.find({
      where,
      relations: ["component"],
    });
  }

  /**
   * Finds all bindings linked to a specific catalog component.
   *
   * @param componentId - The component UUID to search for
   * @param organizationId - Optional organization UUID to scope the query
   * @returns Array of matching FluxBinding entities with their component relations
   */
  async findByComponent(
    componentId: string,
    organizationId?: string,
  ): Promise<FluxBinding[]> {
    const where: Record<string, unknown> = { componentId };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.bindingRepository.find({
      where,
      relations: ["component"],
    });
  }

  /**
   * Removes a binding by its UUID, optionally scoped to an organization.
   * Returns NotFoundException when the binding does not exist or does not
   * belong to the given organization (to prevent information disclosure).
   *
   * @param id - The binding UUID
   * @param organizationId - Optional org UUID; when provided, the binding must
   *                         belong to this org or the removal is rejected
   * @throws NotFoundException if no binding with the given id exists, or if
   *         the binding's org does not match the provided org
   */
  async remove(id: string, organizationId?: string): Promise<void> {
    const binding = await this.bindingRepository.findOne({ where: { id } });

    if (!binding) {
      throw new NotFoundException(`Flux binding "${id}" not found`);
    }

    if (
      organizationId &&
      binding.organizationId &&
      binding.organizationId !== organizationId
    ) {
      throw new NotFoundException(`Flux binding "${id}" not found`);
    }

    await this.bindingRepository.remove(binding);

    this.logger.log(`Removed Flux binding: id="${id}"`);
  }
}
