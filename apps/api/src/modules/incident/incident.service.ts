import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Incident, IncidentStatus } from "./entities/incident.entity";
import { IncidentUpdate } from "./entities/incident-update.entity";
import { Component } from "../catalog/entities/component.entity";
import { Environment } from "../environments/entities/environment.entity";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import { UpdateIncidentDto } from "./dto/update-incident.dto";
import { UpdateIncidentStatusDto } from "./dto/update-incident-status.dto";
import { ListIncidentsQueryDto } from "./dto/list-incidents-query.dto";
import { EventsGateway } from "../../common/events/events.gateway";

/**
 * Allowed status transitions.
 * Keys are the current status; values are the set of statuses reachable from it.
 */
const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [
    IncidentStatus.INVESTIGATING,
    IncidentStatus.IDENTIFIED,
  ],
  [IncidentStatus.INVESTIGATING]: [
    IncidentStatus.IDENTIFIED,
    IncidentStatus.RESOLVED,
  ],
  [IncidentStatus.IDENTIFIED]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [],
};

/**
 * Service responsible for managing incidents and their status transitions.
 */
@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);

  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
    @InjectRepository(IncidentUpdate)
    private readonly incidentUpdateRepository: Repository<IncidentUpdate>,
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    @InjectRepository(Environment)
    private readonly environmentRepository: Repository<Environment>,
    @Optional() private readonly eventsGateway?: EventsGateway,
  ) {}

  /**
   * Creates a new incident, optionally attaching affected components and environments.
   * @param dto - Data for the new incident
   * @param organizationId - Optional organization scope (overrides dto value)
   * @returns The created incident with its relations
   */
  async create(
    dto: CreateIncidentDto,
    organizationId?: string,
  ): Promise<Incident> {
    const incident = this.incidentRepository.create({
      title: dto.title,
      description: dto.description,
      severity: dto.severity,
      commanderUserId: dto.commanderUserId,
      organizationId: organizationId ?? dto.organizationId,
    });

    if (dto.affectedComponentIds?.length) {
      incident.affectedComponents = await this.componentRepository.findBy({
        id: In(dto.affectedComponentIds),
      });
    }

    if (dto.affectedEnvironmentIds?.length) {
      incident.affectedEnvironments = await this.environmentRepository.findBy({
        id: In(dto.affectedEnvironmentIds),
      });
    }

    const saved = await this.incidentRepository.save(incident);
    this.logger.log(`Created incident: ${saved.id} — ${saved.title}`);

    this.eventsGateway?.emitIncidentCreated({
      id: saved.id,
      title: saved.title,
      severity: saved.severity,
      status: saved.status,
      timestamp: new Date().toISOString(),
    });

    return saved;
  }

  /**
   * Lists incidents with optional filters and pagination.
   * Uses a QueryBuilder to support filtering by ManyToMany relations.
   * @param query - Filter and pagination parameters
   * @returns A tuple of [incidents, total count]
   */
  async findAll(query: ListIncidentsQueryDto): Promise<[Incident[], number]> {
    const {
      severity,
      status,
      componentId,
      environmentId,
      organizationId,
      skip = 0,
      take = 20,
    } = query;

    const qb = this.incidentRepository
      .createQueryBuilder("incident")
      .leftJoinAndSelect("incident.affectedComponents", "component")
      .leftJoinAndSelect("incident.affectedEnvironments", "environment");

    if (severity !== undefined) {
      qb.andWhere("incident.severity = :severity", { severity });
    }
    if (status !== undefined) {
      qb.andWhere("incident.status = :status", { status });
    }
    if (organizationId !== undefined) {
      qb.andWhere("incident.organizationId = :organizationId", {
        organizationId,
      });
    }
    if (componentId !== undefined) {
      qb.andWhere("component.id = :componentId", { componentId });
    }
    if (environmentId !== undefined) {
      qb.andWhere("environment.id = :environmentId", { environmentId });
    }

    qb.orderBy("incident.createdAt", "DESC").skip(skip).take(take);

    return await qb.getManyAndCount();
  }

  /**
   * Retrieves a single incident by ID with all relations loaded.
   * @param id - UUID of the incident
   * @returns The incident
   * @throws NotFoundException if no incident with the given ID exists
   */
  async findOne(id: string): Promise<Incident> {
    const incident = await this.incidentRepository.findOne({
      where: { id },
      relations: ["affectedComponents", "affectedEnvironments", "updates"],
    });
    if (!incident) {
      throw new NotFoundException(`Incident with ID "${id}" not found`);
    }
    return incident;
  }

  /**
   * Updates an existing incident. Replaces affected component and environment
   * relations when the corresponding ID arrays are provided.
   * @param id - UUID of the incident to update
   * @param dto - Fields to update
   * @returns The updated incident
   * @throws NotFoundException if no incident with the given ID exists
   */
  async update(id: string, dto: UpdateIncidentDto): Promise<Incident> {
    const incident = await this.findOne(id);

    const { affectedComponentIds, affectedEnvironmentIds, ...rest } = dto;

    const updated = this.incidentRepository.merge(incident, rest);

    if (affectedComponentIds !== undefined) {
      updated.affectedComponents = affectedComponentIds.length
        ? await this.componentRepository.findBy({
            id: In(affectedComponentIds),
          })
        : [];
    }

    if (affectedEnvironmentIds !== undefined) {
      updated.affectedEnvironments = affectedEnvironmentIds.length
        ? await this.environmentRepository.findBy({
            id: In(affectedEnvironmentIds),
          })
        : [];
    }

    this.logger.log(`Updating incident: ${id}`);
    return await this.incidentRepository.save(updated);
  }

  /**
   * Transitions an incident to a new status, enforcing allowed transitions.
   * Automatically creates an IncidentUpdate timeline entry and emits a
   * WebSocket event.
   * @param id - UUID of the incident
   * @param statusDto - Target status and optional message
   * @param authorId - UUID of the user performing the transition
   * @returns The updated incident
   * @throws NotFoundException if no incident with the given ID exists
   * @throws BadRequestException if the transition is not allowed
   */
  async updateStatus(
    id: string,
    statusDto: UpdateIncidentStatusDto,
    authorId?: string,
  ): Promise<Incident> {
    const incident = await this.findOne(id);
    const previousStatus = incident.status;
    const newStatus = statusDto.status;

    if (previousStatus === newStatus) {
      throw new BadRequestException(
        `Incident is already in "${newStatus}" status`,
      );
    }

    const allowed = ALLOWED_TRANSITIONS[previousStatus];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${previousStatus}" to "${newStatus}". ` +
          `Allowed transitions: ${allowed.length ? allowed.join(", ") : "none (terminal state)"}`,
      );
    }

    incident.status = newStatus;
    if (newStatus === IncidentStatus.RESOLVED) {
      incident.resolvedAt = new Date();
    }

    await this.incidentRepository.save(incident);

    // Create automatic timeline entry for the status change.
    const updateMessage =
      statusDto.message ??
      `Status changed from "${previousStatus}" to "${newStatus}"`;

    const timelineEntry = this.incidentUpdateRepository.create({
      incidentId: id,
      authorId: authorId ?? undefined,
      message: updateMessage,
      previousStatus,
      newStatus,
    });
    await this.incidentUpdateRepository.save(timelineEntry);

    this.logger.log(
      `Incident ${id} transitioned: ${previousStatus} -> ${newStatus}`,
    );

    this.eventsGateway?.emitIncidentStatusChanged({
      id: incident.id,
      title: incident.title,
      previousStatus,
      newStatus,
      timestamp: new Date().toISOString(),
    });

    return incident;
  }

  /**
   * Removes an incident.
   * @param id - UUID of the incident to remove
   * @throws NotFoundException if no incident with the given ID exists
   */
  async remove(id: string): Promise<void> {
    const incident = await this.findOne(id);
    await this.incidentRepository.remove(incident);
    this.logger.log(`Removed incident: ${id} — ${incident.title}`);
  }
}
