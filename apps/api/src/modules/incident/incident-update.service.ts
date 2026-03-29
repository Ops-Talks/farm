import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IncidentUpdate } from "./entities/incident-update.entity";
import { Incident } from "./entities/incident.entity";
import { CreateIncidentUpdateDto } from "./dto/create-incident-update.dto";

/**
 * Service responsible for managing manual incident timeline entries.
 */
@Injectable()
export class IncidentUpdateService {
  private readonly logger = new Logger(IncidentUpdateService.name);

  constructor(
    @InjectRepository(IncidentUpdate)
    private readonly incidentUpdateRepository: Repository<IncidentUpdate>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
  ) {}

  /**
   * Creates a manual timeline entry for an incident (no status change).
   * @param incidentId - UUID of the parent incident
   * @param dto - The update message
   * @param authorId - UUID of the authoring user
   * @returns The created timeline entry
   * @throws NotFoundException if the parent incident does not exist
   */
  async create(
    incidentId: string,
    dto: CreateIncidentUpdateDto,
    authorId?: string,
  ): Promise<IncidentUpdate> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
    });
    if (!incident) {
      throw new NotFoundException(`Incident with ID "${incidentId}" not found`);
    }

    const entry = this.incidentUpdateRepository.create({
      incidentId,
      authorId: authorId ?? undefined,
      message: dto.message,
    });

    this.logger.log(
      `Creating manual timeline entry for incident ${incidentId}`,
    );
    return await this.incidentUpdateRepository.save(entry);
  }

  /**
   * Retrieves all timeline entries for an incident, ordered chronologically.
   * @param incidentId - UUID of the incident
   * @returns Array of timeline entries
   */
  async findByIncident(incidentId: string): Promise<IncidentUpdate[]> {
    return await this.incidentUpdateRepository.find({
      where: { incidentId },
      order: { createdAt: "ASC" },
    });
  }
}
