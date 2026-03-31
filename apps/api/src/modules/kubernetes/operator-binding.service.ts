import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OperatorBinding } from "./entities/operator-binding.entity";
import { CreateOperatorBindingDto } from "./dto/create-operator-binding.dto";

/**
 * Service for managing operator-to-component bindings.
 * Provides CRUD operations to link Kubernetes operators to catalog components.
 */
@Injectable()
export class OperatorBindingService {
  private readonly logger = new Logger(OperatorBindingService.name);

  constructor(
    @InjectRepository(OperatorBinding)
    private readonly bindingRepository: Repository<OperatorBinding>,
  ) {}

  /**
   * Creates a new operator-to-component binding.
   *
   * @param dto - Data for the new binding
   * @returns The persisted OperatorBinding entity
   * @throws ConflictException if a binding with the same operator name,
   *         namespace, and component already exists
   */
  async create(dto: CreateOperatorBindingDto): Promise<OperatorBinding> {
    const existing = await this.bindingRepository.findOne({
      where: {
        operatorName: dto.operatorName,
        operatorNamespace: dto.operatorNamespace,
        componentId: dto.componentId,
        ...(dto.organizationId ? { organizationId: dto.organizationId } : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Binding already exists for operator "${dto.operatorName}" in namespace "${dto.operatorNamespace}" with component "${dto.componentId}"`,
      );
    }

    const binding = this.bindingRepository.create(dto);
    const saved = await this.bindingRepository.save(binding);

    this.logger.log(
      `Created binding: operator="${dto.operatorName}" namespace="${dto.operatorNamespace}" component="${dto.componentId}"`,
    );

    return saved;
  }

  /**
   * Finds all bindings for a given operator name, optionally scoped to an organization.
   *
   * @param operatorName - The operator name to search for
   * @param organizationId - Optional organization UUID to scope the query
   * @returns Array of matching OperatorBinding entities with their component relations
   */
  async findByOperator(
    operatorName: string,
    organizationId?: string,
  ): Promise<OperatorBinding[]> {
    const where: Record<string, unknown> = { operatorName };

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
   * @returns Array of matching OperatorBinding entities
   */
  async findByComponent(componentId: string): Promise<OperatorBinding[]> {
    return this.bindingRepository.find({
      where: { componentId },
      relations: ["component"],
    });
  }

  /**
   * Removes a binding identified by operator name, namespace, component, and organization.
   *
   * @param operatorName - Operator name
   * @param operatorNamespace - Kubernetes namespace
   * @param componentId - Component UUID
   * @param organizationId - Organization UUID to scope the binding
   * @throws NotFoundException if no matching binding exists
   */
  async remove(
    operatorName: string,
    operatorNamespace: string,
    componentId: string,
    organizationId: string,
  ): Promise<void> {
    const binding = await this.bindingRepository.findOne({
      where: { operatorName, operatorNamespace, componentId, organizationId },
    });

    if (!binding) {
      throw new NotFoundException(
        `Binding not found for operator "${operatorName}" in namespace "${operatorNamespace}" with component "${componentId}" and organization "${organizationId}"`,
      );
    }

    await this.bindingRepository.remove(binding);

    this.logger.log(
      `Removed binding: operator="${operatorName}" namespace="${operatorNamespace}" component="${componentId}" organization="${organizationId}"`,
    );
  }
}
