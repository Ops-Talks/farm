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
  async findAll(
    skip = 0,
    take = 20,
    filters?: {
      componentId?: string;
      environmentId?: string;
      status?: DeploymentStatus;
    },
  ): Promise<[Deployment[], number]> {
    const where: Record<string, unknown> = {};

    if (filters?.componentId) where.componentId = filters.componentId;
    if (filters?.environmentId) where.environmentId = filters.environmentId;
    if (filters?.status) where.status = filters.status;

    return await this.deploymentRepository.findAndCount({
      where,
      relations: ["component", "environment"],
      order: { createdAt: "DESC" },
      skip,
      take,
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
   * Uses a single query with a subquery for MAX(createdAt) grouped by environmentId.
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

    const subQuery = this.deploymentRepository
      .createQueryBuilder("sub")
      .select("sub.environmentId", "environmentId")
      .addSelect("MAX(sub.createdAt)", "maxCreatedAt")
      .where("sub.componentId = :componentId", { componentId })
      .andWhere("sub.status = :status", {
        status: DeploymentStatus.SUCCEEDED,
      })
      .groupBy("sub.environmentId");

    const results = await this.deploymentRepository
      .createQueryBuilder("d")
      .innerJoin(
        "(" + subQuery.getQuery() + ")",
        "latest",
        "d.environmentId = latest.environmentId AND d.createdAt = latest.maxCreatedAt",
      )
      .setParameters(subQuery.getParameters())
      .leftJoinAndSelect("d.component", "component")
      .leftJoinAndSelect("d.environment", "environment")
      .where("d.componentId = :componentId", { componentId })
      .andWhere("d.status = :status", {
        status: DeploymentStatus.SUCCEEDED,
      })
      .orderBy("environment.order", "ASC")
      .getMany();

    return results;
  }

  /**
   * Returns a matrix of all components with their latest successful deployment per environment.
   * Applies filters at the query level and uses a single aggregation query.
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
    const componentQuery = this.componentRepository.createQueryBuilder("c");

    if (filters?.kindGroup) {
      const allowedKinds = Object.entries(COMPONENT_KIND_GROUPS)
        .filter(([, group]) => group === filters.kindGroup)
        .map(([kind]) => kind);
      componentQuery.andWhere("c.kind IN (:...kinds)", { kinds: allowedKinds });
    }

    if (filters?.owner) {
      componentQuery.andWhere("c.owner = :owner", { owner: filters.owner });
    }

    if (filters?.lifecycle) {
      componentQuery.andWhere("c.lifecycle = :lifecycle", {
        lifecycle: filters.lifecycle,
      });
    }

    componentQuery.orderBy("c.name", "ASC");

    const components = await componentQuery.getMany();

    if (components.length === 0) {
      return [];
    }

    const environments = await this.environmentRepository.find({
      order: { order: "ASC" },
    });

    if (environments.length === 0) {
      return components.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        environments: [],
      }));
    }

    const componentIds = components.map((c) => c.id);

    // Single query to get the latest successful deployment per component per environment
    const latestDeployments = await this.deploymentRepository
      .createQueryBuilder("d")
      .select("d.componentId", "componentId")
      .addSelect("d.environmentId", "environmentId")
      .addSelect("d.version", "version")
      .addSelect("d.status", "status")
      .addSelect("d.createdAt", "deployedAt")
      .where("d.componentId IN (:...componentIds)", { componentIds })
      .andWhere("d.status = :status", {
        status: DeploymentStatus.SUCCEEDED,
      })
      .andWhere(
        "d.createdAt = " +
          this.deploymentRepository
            .createQueryBuilder("sub")
            .select("MAX(sub.createdAt)")
            .where("sub.componentId = d.componentId")
            .andWhere("sub.environmentId = d.environmentId")
            .andWhere("sub.status = :subStatus")
            .getQuery(),
      )
      .setParameter("subStatus", DeploymentStatus.SUCCEEDED)
      .getRawMany<{
        componentId: string;
        environmentId: string;
        version: string;
        status: DeploymentStatus;
        deployedAt: Date;
      }>();

    // Index deployments by composite key for O(1) lookup
    const deploymentMap = new Map<
      string,
      {
        version: string;
        status: DeploymentStatus;
        deployedAt: Date;
      }
    >();
    for (const dep of latestDeployments) {
      deploymentMap.set(`${dep.componentId}:${dep.environmentId}`, {
        version: dep.version,
        status: dep.status,
        deployedAt: dep.deployedAt,
      });
    }

    return components.map((component) => ({
      id: component.id,
      name: component.name,
      kind: component.kind,
      environments: environments.map((env) => {
        const dep = deploymentMap.get(`${component.id}:${env.id}`);
        return {
          environmentId: env.id,
          environmentName: env.name,
          version: dep?.version || null,
          status: dep?.status || null,
          deployedAt: dep?.deployedAt || null,
        };
      }),
    }));
  }
}
