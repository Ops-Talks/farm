import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PostMortem } from "./entities/post-mortem.entity";
import { Incident } from "./entities/incident.entity";
import { CreatePostMortemDto } from "./dto/create-post-mortem.dto";
import { UpdatePostMortemDto } from "./dto/update-post-mortem.dto";

/**
 * Service responsible for managing post-mortem analyses linked to incidents.
 */
@Injectable()
export class PostMortemService {
  private readonly logger = new Logger(PostMortemService.name);

  constructor(
    @InjectRepository(PostMortem)
    private readonly postMortemRepository: Repository<PostMortem>,
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
  ) {}

  /**
   * Creates a new post-mortem for an incident.
   * @param dto - Data for the new post-mortem
   * @param organizationId - Optional organization scope (overrides dto value)
   * @returns The created post-mortem
   * @throws NotFoundException if the referenced incident does not exist
   * @throws ConflictException if a post-mortem already exists for the incident
   */
  async create(
    dto: CreatePostMortemDto,
    organizationId?: string,
  ): Promise<PostMortem> {
    const incident = await this.incidentRepository.findOne({
      where: { id: dto.incidentId },
    });
    if (!incident) {
      throw new NotFoundException(
        `Incident with ID "${dto.incidentId}" not found`,
      );
    }

    const existing = await this.postMortemRepository.findOne({
      where: { incidentId: dto.incidentId },
    });
    if (existing) {
      throw new ConflictException(
        `A post-mortem already exists for incident "${dto.incidentId}"`,
      );
    }

    const postMortem = this.postMortemRepository.create({
      ...dto,
      organizationId: organizationId ?? dto.organizationId,
    });

    this.logger.log(`Creating post-mortem for incident ${dto.incidentId}`);
    return await this.postMortemRepository.save(postMortem);
  }

  /**
   * Retrieves a single post-mortem by its own ID.
   * @param id - UUID of the post-mortem
   * @returns The post-mortem
   * @throws NotFoundException if not found
   */
  async findOne(id: string): Promise<PostMortem> {
    const postMortem = await this.postMortemRepository.findOne({
      where: { id },
      relations: ["incident"],
    });
    if (!postMortem) {
      throw new NotFoundException(`Post-mortem with ID "${id}" not found`);
    }
    return postMortem;
  }

  /**
   * Retrieves a post-mortem by the related incident ID.
   * @param incidentId - UUID of the incident
   * @returns The post-mortem or null if none exists
   */
  async findByIncident(incidentId: string): Promise<PostMortem | null> {
    return await this.postMortemRepository.findOne({
      where: { incidentId },
      relations: ["incident"],
    });
  }

  /**
   * Updates an existing post-mortem.
   * @param id - UUID of the post-mortem to update
   * @param dto - Fields to update
   * @returns The updated post-mortem
   * @throws NotFoundException if not found
   */
  async update(id: string, dto: UpdatePostMortemDto): Promise<PostMortem> {
    const postMortem = await this.findOne(id);
    const updated = this.postMortemRepository.merge(postMortem, dto);
    this.logger.log(`Updating post-mortem: ${id}`);
    return await this.postMortemRepository.save(updated);
  }

  /**
   * Marks a post-mortem as approved by a given user.
   * @param id - UUID of the post-mortem to approve
   * @param userId - UUID of the approving user
   * @returns The approved post-mortem
   * @throws NotFoundException if not found
   */
  async approve(id: string, userId: string): Promise<PostMortem> {
    const postMortem = await this.findOne(id);
    postMortem.approvedBy = userId;
    postMortem.approvedAt = new Date();
    this.logger.log(`Post-mortem ${id} approved by user ${userId}`);
    return await this.postMortemRepository.save(postMortem);
  }
}
