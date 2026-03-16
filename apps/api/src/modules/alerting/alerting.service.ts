import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { AlertingRule } from "./entities/alerting-rule.entity";
import { CreateAlertingRuleDto } from "./dto/create-alerting-rule.dto";
import { UpdateAlertingRuleDto } from "./dto/update-alerting-rule.dto";
import { ListAlertingRulesQueryDto } from "./dto/list-alerting-rules-query.dto";

/**
 * Service responsible for managing PromQL-based alerting rules.
 */
@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);

  constructor(
    @InjectRepository(AlertingRule)
    private readonly alertingRuleRepository: Repository<AlertingRule>,
  ) {}

  /**
   * Creates a new alerting rule.
   * @param createAlertingRuleDto - Data for the new rule
   * @returns The created alerting rule
   * @throws ConflictException if a rule with the same name already exists
   */
  async create(
    createAlertingRuleDto: CreateAlertingRuleDto,
  ): Promise<AlertingRule> {
    const existing = await this.alertingRuleRepository.findOne({
      where: { name: createAlertingRuleDto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Alerting rule with name "${createAlertingRuleDto.name}" already exists`,
      );
    }

    const rule = this.alertingRuleRepository.create(createAlertingRuleDto);
    this.logger.log(`Creating alerting rule: ${createAlertingRuleDto.name}`);
    return await this.alertingRuleRepository.save(rule);
  }

  /**
   * Retrieves alerting rules with optional filters and pagination.
   * @param query - Optional filter and pagination parameters
   * @returns A tuple of [rules, total count]
   */
  async findAll(
    query: ListAlertingRulesQueryDto,
  ): Promise<[AlertingRule[], number]> {
    const {
      componentId,
      environmentId,
      severity,
      organizationId,
      enabled,
      skip = 0,
      take = 20,
    } = query;

    const where: FindOptionsWhere<AlertingRule> = {};

    if (componentId !== undefined) where.componentId = componentId;
    if (environmentId !== undefined) where.environmentId = environmentId;
    if (severity !== undefined) where.severity = severity;
    if (organizationId !== undefined) where.organizationId = organizationId;
    if (enabled !== undefined) where.enabled = enabled;

    return await this.alertingRuleRepository.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single alerting rule by ID.
   * @param id - The UUID of the alerting rule
   * @returns The alerting rule with the specified ID
   * @throws NotFoundException if no rule with the given ID exists
   */
  async findOne(id: string): Promise<AlertingRule> {
    const rule = await this.alertingRuleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Alerting rule with ID "${id}" not found`);
    }
    return rule;
  }

  /**
   * Updates an existing alerting rule.
   * @param id - The UUID of the rule to update
   * @param updateAlertingRuleDto - Fields to update
   * @returns The updated alerting rule
   * @throws NotFoundException if no rule with the given ID exists
   * @throws ConflictException if the new name conflicts with an existing rule
   */
  async update(
    id: string,
    updateAlertingRuleDto: UpdateAlertingRuleDto,
  ): Promise<AlertingRule> {
    const rule = await this.findOne(id);

    if (
      updateAlertingRuleDto.name &&
      updateAlertingRuleDto.name !== rule.name
    ) {
      const existing = await this.alertingRuleRepository.findOne({
        where: { name: updateAlertingRuleDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Alerting rule with name "${updateAlertingRuleDto.name}" already exists`,
        );
      }
    }

    const updated = this.alertingRuleRepository.merge(
      rule,
      updateAlertingRuleDto,
    );
    this.logger.log(`Updating alerting rule: ${rule.name}`);
    return await this.alertingRuleRepository.save(updated);
  }

  /**
   * Removes an alerting rule.
   * @param id - The UUID of the rule to remove
   * @throws NotFoundException if no rule with the given ID exists
   */
  async remove(id: string): Promise<void> {
    const rule = await this.findOne(id);
    await this.alertingRuleRepository.remove(rule);
    this.logger.log(`Removed alerting rule: ${rule.name}`);
  }
}
