import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import {
  EnvironmentRequest,
  EnvironmentRequestStatus,
} from "./entities/environment-request.entity";
import { CreateEnvironmentRequestDto } from "./dto/create-environment-request.dto";
import { UpdateEnvironmentRequestDto } from "./dto/update-environment-request.dto";
import { ListEnvironmentRequestsQueryDto } from "./dto/list-environment-requests-query.dto";

/**
 * Service responsible for managing environment requests including
 * creation, review workflows, and lifecycle transitions.
 */
@Injectable()
export class EnvironmentRequestService {
  private readonly logger = new Logger(EnvironmentRequestService.name);

  constructor(
    @InjectRepository(EnvironmentRequest)
    private readonly environmentRequestRepository: Repository<EnvironmentRequest>,
  ) {}

  /**
   * Creates a new environment request on behalf of a user.
   * @param dto - Data for the new environment request
   * @param userId - The ID of the user creating the request
   * @param organizationId - Optional organization scope (overrides dto value)
   * @returns The created environment request
   */
  async create(
    dto: CreateEnvironmentRequestDto,
    userId: string,
    organizationId?: string,
  ): Promise<EnvironmentRequest> {
    const request = this.environmentRequestRepository.create({
      ...dto,
      requestedBy: userId,
      status: EnvironmentRequestStatus.PENDING,
      organizationId: organizationId ?? dto.organizationId,
    });
    this.logger.log(
      `Creating environment request "${dto.name}" by user ${userId}`,
    );
    return await this.environmentRequestRepository.save(request);
  }

  /**
   * Retrieves environment requests with optional filters and pagination.
   * @param query - Optional filter and pagination parameters
   * @returns A tuple of [environment requests, total count]
   */
  async findAll(
    query: ListEnvironmentRequestsQueryDto,
  ): Promise<[EnvironmentRequest[], number]> {
    const {
      status,
      type,
      requestedBy,
      organizationId,
      skip = 0,
      take = 20,
    } = query;

    const where: FindOptionsWhere<EnvironmentRequest> = {};

    if (status !== undefined) where.status = status;
    if (type !== undefined) where.type = type;
    if (requestedBy !== undefined) where.requestedBy = requestedBy;
    if (organizationId !== undefined) where.organizationId = organizationId;

    return await this.environmentRequestRepository.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single environment request by ID.
   * @param id - The UUID of the environment request
   * @returns The environment request with the specified ID
   * @throws NotFoundException if no request with the given ID exists
   */
  async findOne(id: string): Promise<EnvironmentRequest> {
    const request = await this.environmentRequestRepository.findOne({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException(
        `Environment request with ID "${id}" not found`,
      );
    }
    return request;
  }

  /**
   * Updates an existing environment request.
   * Only requests in PENDING status can be updated.
   * @param id - The UUID of the environment request to update
   * @param dto - Fields to update (name, description, ttlHours only)
   * @returns The updated environment request
   * @throws NotFoundException if no request with the given ID exists
   * @throws BadRequestException if the request is not in PENDING status
   */
  async update(
    id: string,
    dto: UpdateEnvironmentRequestDto,
  ): Promise<EnvironmentRequest> {
    const request = await this.findOne(id);

    if (request.status !== EnvironmentRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update request in status "${request.status}"`,
      );
    }

    const updated = this.environmentRequestRepository.merge(request, dto);
    this.logger.log(`Updating environment request: ${request.name}`);
    return await this.environmentRequestRepository.save(updated);
  }

  /**
   * Removes an environment request.
   * Only requests in PENDING status can be removed.
   * @param id - The UUID of the environment request to remove
   * @throws NotFoundException if no request with the given ID exists
   * @throws BadRequestException if the request is not in PENDING status
   */
  async remove(id: string): Promise<void> {
    const request = await this.findOne(id);

    if (request.status !== EnvironmentRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot remove request in status "${request.status}"`,
      );
    }

    await this.environmentRequestRepository.remove(request);
    this.logger.log(`Removed environment request: ${request.name}`);
  }

  /**
   * Approves a pending environment request and simulates provisioning.
   * Transitions the request through APPROVED -> PROVISIONING -> ACTIVE
   * and calculates the expiration time based on ttlHours.
   * @param id - The UUID of the environment request to approve
   * @param reviewerId - The ID of the admin approving the request
   * @param comment - Optional review comment
   * @returns The updated environment request in ACTIVE status
   * @throws NotFoundException if no request with the given ID exists
   * @throws BadRequestException if the request is not in PENDING status
   */
  async approve(
    id: string,
    reviewerId: string,
    comment?: string,
  ): Promise<EnvironmentRequest> {
    const request = await this.findOne(id);

    if (request.status !== EnvironmentRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve request in status "${request.status}"`,
      );
    }

    const now = new Date();

    // Simulate the full provisioning lifecycle:
    // PENDING -> APPROVED -> PROVISIONING -> ACTIVE
    request.status = EnvironmentRequestStatus.ACTIVE;
    request.reviewedBy = reviewerId;
    request.reviewedAt = now;
    if (comment !== undefined) {
      request.statusMessage = comment;
    }
    request.provisionedAt = now;
    if (typeof request.ttlHours === "number" && request.ttlHours > 0) {
      request.expiresAt = new Date(
        now.getTime() + request.ttlHours * 60 * 60 * 1000,
      );
    }

    this.logger.log(
      `Approved and provisioned environment request "${request.name}" by reviewer ${reviewerId}`,
    );
    return await this.environmentRequestRepository.save(request);
  }

  /**
   * Rejects a pending environment request.
   * @param id - The UUID of the environment request to reject
   * @param reviewerId - The ID of the admin rejecting the request
   * @param comment - Optional review comment explaining the rejection
   * @returns The updated environment request in REJECTED status
   * @throws NotFoundException if no request with the given ID exists
   * @throws BadRequestException if the request is not in PENDING status
   */
  async reject(
    id: string,
    reviewerId: string,
    comment?: string,
  ): Promise<EnvironmentRequest> {
    const request = await this.findOne(id);

    if (request.status !== EnvironmentRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject request in status "${request.status}"`,
      );
    }

    request.status = EnvironmentRequestStatus.REJECTED;
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date();
    if (comment !== undefined) {
      request.statusMessage = comment;
    }

    this.logger.log(
      `Rejected environment request "${request.name}" by reviewer ${reviewerId}`,
    );
    return await this.environmentRequestRepository.save(request);
  }

  /**
   * Expires an active environment request.
   * @param id - The UUID of the environment request to expire
   * @returns The updated environment request in EXPIRED status
   * @throws NotFoundException if no request with the given ID exists
   * @throws BadRequestException if the request is not in ACTIVE status
   */
  async expire(id: string): Promise<EnvironmentRequest> {
    const request = await this.findOne(id);

    if (request.status !== EnvironmentRequestStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot expire request in status "${request.status}"`,
      );
    }

    request.status = EnvironmentRequestStatus.EXPIRED;

    this.logger.log(`Expired environment request "${request.name}"`);
    return await this.environmentRequestRepository.save(request);
  }
}
