import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Deployment,
  DeploymentStatus,
  DEPLOYMENT_STATUS_TRANSITIONS,
} from "./entities/deployment.entity";
import { Environment } from "./entities/environment.entity";
import {
  Component,
  ComponentKindGroup,
  ComponentLifecycle,
  COMPONENT_KIND_GROUPS,
} from "../catalog/entities/component.entity";
import { CreateDeploymentDto } from "./dto/create-deployment.dto";
import { UpdateDeploymentDto } from "./dto/update-deployment.dto";

/**
 * Service responsible for managing deployments of components to environments.
 */
@Injectable()
export class DeploymentsService {
  private readonly logger = new Logger(DeploymentsService.name);

  constructor(
    @InjectRepository(Deployment)
    private readonly deploymentRepository: Repository<Deployment>,
    @InjectRepository(Environment)
    private readonly environmentRepository: Repository<Environment>,
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
  ) {}

  /**
   * Creates a new deployment record.
   * @param createDeploymentDto - Data for the deployment
   * @returns The newly created deployment
   * @throws NotFoundException if the component or environment does not exist
   */
  async create(createDeploymentDto: CreateDeploymentDto): Promise<Deployment> {
    const component = await this.componentRepository.findOne({
      where: { id: createDeploymentDto.componentId },
    });
    if (!component) {
      throw new NotFoundException(
        `Component with ID "${createDeploymentDto.componentId}" not found`,
      );
    }

    const environment = await this.environmentRepository.findOne({
      where: { id: createDeploymentDto.environmentId },
    });
    if (!environment) {
      throw new NotFoundException(
        `Environment with ID "${createDeploymentDto.environmentId}" not found`,
      );
    }

    const deployment = this.deploymentRepository.create({
      ...createDeploymentDto,
      startedAt: new Date(),
    });

    this.logger.log(
      `Creating deployment: ${component.name}@${createDeploymentDto.version} -> ${environment.name}`,
    );

    return await this.deploymentRepository.save(deployment);
  }

  /**
   * Retrieves deployments with optional filters.
   * @param filters - Optional filters for componentId, environmentId, status
   * @returns An array of matching deployments
   */
  async findAll(filters?: {
    componentId?: string;
    environmentId?: string;
    status?: DeploymentStatus;
  }): Promise<Deployment[]> {
    const where: Record<string, unknown> = {};

    if (filters?.componentId) where.componentId = filters.componentId;
    if (filters?.environmentId) where.environmentId = filters.environmentId;
    if (filters?.status) where.status = filters.status;

    return await this.deploymentRepository.find({
      where,
      relations: ["component", "environment"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Retrieves a single deployment by ID.
   * @param id - The UUID of the deployment
   * @returns The deployment with the specified ID
   * @throws NotFoundException if no deployment with the given ID exists
   */
  async findOne(id: string): Promise<Deployment> {
    const deployment = await this.deploymentRepository.findOne({
      where: { id },
      relations: ["component", "environment"],
    });
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID "${id}" not found`);
    }
    return deployment;
  }

  /**
   * Updates a deployment (primarily for status transitions).
   * @param id - The UUID of the deployment to update
   * @param updateDeploymentDto - Fields to update
   * @returns The updated deployment
   * @throws NotFoundException if no deployment with the given ID exists
   * @throws BadRequestException if the status transition is invalid
   */
  async update(
    id: string,
    updateDeploymentDto: UpdateDeploymentDto,
  ): Promise<Deployment> {
    const deployment = await this.findOne(id);

    if (updateDeploymentDto.status) {
      const allowedTransitions =
        DEPLOYMENT_STATUS_TRANSITIONS[deployment.status];
      if (!allowedTransitions.includes(updateDeploymentDto.status)) {
        throw new BadRequestException(
          `Invalid status transition from "${deployment.status}" to "${updateDeploymentDto.status}". ` +
            `Allowed transitions: ${allowedTransitions.join(", ")}`,
        );
      }
    }

    if (updateDeploymentDto.metadata) {
      updateDeploymentDto.metadata = {
        ...(deployment.metadata || {}),
        ...updateDeploymentDto.metadata,
      };
    }

    const updated = this.deploymentRepository.merge(
      deployment,
      updateDeploymentDto as Partial<Deployment>,
    );
    return await this.deploymentRepository.save(updated);
  }

  /**
   * Returns the latest successful deployment for each environment of a given component.
   * @param componentId - The UUID of the component
   * @returns An array of the latest deployments per environment
   */
  async findLatestByComponent(componentId: string): Promise<Deployment[]> {
    const component = await this.componentRepository.findOne({
      where: { id: componentId },
    });
    if (!component) {
      throw new NotFoundException(
        `Component with ID "${componentId}" not found`,
      );
    }

    const environments = await this.environmentRepository.find({
      order: { order: "ASC" },
    });

    const results: Deployment[] = [];
    for (const env of environments) {
      const latest = await this.deploymentRepository.findOne({
        where: {
          componentId,
          environmentId: env.id,
          status: DeploymentStatus.SUCCEEDED,
        },
        relations: ["component", "environment"],
        order: { createdAt: "DESC" },
      });
      if (latest) {
        results.push(latest);
      }
    }

    return results;
  }

  /**
   * Returns a matrix of all components with their latest successful deployment per environment.
   * Supports optional filters to narrow the component set.
   * @param filters - Optional filters: kindGroup, owner, lifecycle
   * @returns Array of component entries with their environment deployment status
   */
  async getMatrix(filters?: {
    kindGroup?: ComponentKindGroup;
    owner?: string;
    lifecycle?: ComponentLifecycle;
  }): Promise<
    Array<{
      id: string;
      name: string;
      kind: string;
      environments: Array<{
        environmentId: string;
        environmentName: string;
        version: string | null;
        status: DeploymentStatus | null;
        deployedAt: Date | null;
      }>;
    }>
  > {
    let components = await this.componentRepository.find({
      order: { name: "ASC" },
    });

    if (filters?.kindGroup) {
      const allowedKinds = Object.entries(COMPONENT_KIND_GROUPS)
        .filter(([, group]) => group === filters.kindGroup)
        .map(([kind]) => kind);
      components = components.filter((c) => allowedKinds.includes(c.kind));
    }

    if (filters?.owner) {
      components = components.filter((c) => c.owner === filters.owner);
    }

    if (filters?.lifecycle) {
      components = components.filter((c) => c.lifecycle === filters.lifecycle);
    }

    const environments = await this.environmentRepository.find({
      order: { order: "ASC" },
    });

    const matrix = [];

    for (const component of components) {
      const envStatuses = [];

      for (const env of environments) {
        const latest = await this.deploymentRepository.findOne({
          where: {
            componentId: component.id,
            environmentId: env.id,
            status: DeploymentStatus.SUCCEEDED,
          },
          order: { createdAt: "DESC" },
        });

        envStatuses.push({
          environmentId: env.id,
          environmentName: env.name,
          version: latest?.version || null,
          status: latest?.status || null,
          deployedAt: latest?.createdAt || null,
        });
      }

      matrix.push({
        id: component.id,
        name: component.name,
        kind: component.kind,
        environments: envStatuses,
      });
    }

    return matrix;
  }
}
