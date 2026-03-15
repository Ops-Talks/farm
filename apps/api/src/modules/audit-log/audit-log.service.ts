import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { AuditLog } from "./entities/audit-log.entity";
import { CreateAuditLogDto } from "./dto/create-audit-log.dto";

/**
 * Options for filtering audit log queries.
 */
export interface FindAuditLogsOptions {
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  limit?: number;
}

/**
 * Service responsible for persisting and querying audit log entries.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Persists a new audit log entry.
   * @param entry - The data for the new audit log entry
   * @returns The saved audit log entity
   */
  async log(entry: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(entry);
    this.logger.log(
      `Audit: ${entry.action} on ${entry.resourceType}(${entry.resourceId}) by ${entry.actorUsername}`,
    );
    return await this.auditLogRepository.save(auditLog);
  }

  /**
   * Retrieves audit log entries with optional filtering.
   * Results are ordered by creation date descending, newest first.
   * @param options - Optional filters: resourceType, resourceId, actorId, limit
   * @returns An array of matching audit log entries
   */
  async findAll(options: FindAuditLogsOptions = {}): Promise<AuditLog[]> {
    const { resourceType, resourceId, actorId, limit = 100 } = options;

    const where: FindOptionsWhere<AuditLog> = {};

    if (resourceType !== undefined) {
      where.resourceType = resourceType;
    }
    if (resourceId !== undefined) {
      where.resourceId = resourceId;
    }
    if (actorId !== undefined) {
      where.actorId = actorId;
    }

    return await this.auditLogRepository.find({
      where,
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
