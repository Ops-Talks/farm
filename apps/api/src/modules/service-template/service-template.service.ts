import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import {
  ServiceTemplate,
  TemplateVariable,
} from "./entities/service-template.entity";
import { CreateServiceTemplateDto } from "./dto/create-service-template.dto";
import { UpdateServiceTemplateDto } from "./dto/update-service-template.dto";
import { ListTemplatesQueryDto } from "./dto/list-templates-query.dto";

/**
 * Service responsible for managing service templates used to scaffold
 * new projects in the developer self-service workflow.
 */
@Injectable()
export class ServiceTemplateService {
  private readonly logger = new Logger(ServiceTemplateService.name);

  constructor(
    @InjectRepository(ServiceTemplate)
    private readonly templateRepository: Repository<ServiceTemplate>,
  ) {}

  /**
   * Creates a new service template.
   * @param createDto - Data for the new template
   * @param organizationId - Optional organization scope (overrides dto value)
   * @returns The created service template
   * @throws ConflictException if a template with the same name already exists
   */
  async create(
    createDto: CreateServiceTemplateDto,
    organizationId?: string,
  ): Promise<ServiceTemplate> {
    const existing = await this.templateRepository.findOne({
      where: { name: createDto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Service template with name "${createDto.name}" already exists`,
      );
    }

    const template = this.templateRepository.create({
      ...createDto,
      organizationId: organizationId ?? createDto.organizationId,
    });
    this.logger.log(`Creating service template: ${createDto.name}`);
    return await this.templateRepository.save(template);
  }

  /**
   * Retrieves service templates with optional filters and pagination.
   * @param query - Optional filter and pagination parameters
   * @returns A tuple of [templates, total count]
   */
  async findAll(
    query: ListTemplatesQueryDto,
  ): Promise<[ServiceTemplate[], number]> {
    const { language, framework, organizationId, skip = 0, take = 20 } = query;

    const where: FindOptionsWhere<ServiceTemplate> = {};

    if (language !== undefined) where.language = language;
    if (framework !== undefined) where.framework = framework;
    if (organizationId !== undefined) where.organizationId = organizationId;

    return await this.templateRepository.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single service template by ID.
   * @param id - The UUID of the template
   * @returns The service template with the specified ID
   * @throws NotFoundException if no template with the given ID exists
   */
  async findOne(id: string): Promise<ServiceTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Service template with ID "${id}" not found`);
    }
    return template;
  }

  /**
   * Updates an existing service template.
   * @param id - The UUID of the template to update
   * @param updateDto - Fields to update
   * @returns The updated service template
   * @throws NotFoundException if no template with the given ID exists
   * @throws ConflictException if the new name conflicts with an existing template
   */
  async update(
    id: string,
    updateDto: UpdateServiceTemplateDto,
  ): Promise<ServiceTemplate> {
    const template = await this.findOne(id);

    if (updateDto.name && updateDto.name !== template.name) {
      const existing = await this.templateRepository.findOne({
        where: { name: updateDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Service template with name "${updateDto.name}" already exists`,
        );
      }
    }

    const updated = this.templateRepository.merge(template, updateDto);
    this.logger.log(`Updating service template: ${template.name}`);
    return await this.templateRepository.save(updated);
  }

  /**
   * Removes a service template.
   * @param id - The UUID of the template to remove
   * @throws NotFoundException if no template with the given ID exists
   */
  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
    this.logger.log(`Removed service template: ${template.name}`);
  }

  /**
   * Seeds built-in service templates if none exist.
   * Called during module initialization to ensure a baseline set of
   * templates is always available.
   */
  async seedBuiltInTemplates(): Promise<void> {
    const builtInCount = await this.templateRepository.count({
      where: { isBuiltIn: true },
    });

    if (builtInCount > 0) {
      this.logger.log(
        `Found ${builtInCount} built-in templates, skipping seed`,
      );
      return;
    }

    this.logger.log("Seeding built-in service templates...");

    const builtInTemplates: Partial<ServiceTemplate>[] = [
      {
        name: "nestjs-api",
        description:
          "Production-ready NestJS API with TypeORM, Swagger, and JWT authentication",
        language: "typescript",
        framework: "nestjs",
        tags: ["api", "backend", "microservice"],
        repositoryUrl: "https://github.com/farm-platform/template-nestjs-api",
        isBuiltIn: true,
        variables: [
          {
            key: "SERVICE_NAME",
            label: "Service Name",
            description: "Name of the new service",
            required: true,
            pattern: "^[a-z][a-z0-9-]*$",
          },
          {
            key: "PORT",
            label: "Port",
            description: "HTTP port the service will listen on",
            default: "3000",
            required: false,
          },
          {
            key: "DATABASE_TYPE",
            label: "Database Type",
            description:
              "Database engine to configure (postgres, mysql, sqlite)",
            default: "postgres",
            required: false,
            pattern: "^(postgres|mysql|sqlite)$",
          },
        ] as TemplateVariable[],
      },
      {
        name: "nextjs-app",
        description:
          "Next.js application with App Router, Tailwind CSS, and TypeScript",
        language: "typescript",
        framework: "nextjs",
        tags: ["frontend", "fullstack", "ssr"],
        repositoryUrl: "https://github.com/farm-platform/template-nextjs-app",
        isBuiltIn: true,
        variables: [
          {
            key: "APP_NAME",
            label: "Application Name",
            description: "Name of the new application",
            required: true,
            pattern: "^[a-z][a-z0-9-]*$",
          },
          {
            key: "PORT",
            label: "Port",
            description: "Development server port",
            default: "3000",
            required: false,
          },
        ] as TemplateVariable[],
      },
      {
        name: "go-microservice",
        description:
          "Go microservice with Gin framework, structured logging, and health checks",
        language: "go",
        framework: "gin",
        tags: ["api", "backend", "microservice"],
        repositoryUrl:
          "https://github.com/farm-platform/template-go-microservice",
        isBuiltIn: true,
        variables: [
          {
            key: "SERVICE_NAME",
            label: "Service Name",
            description: "Name of the new service",
            required: true,
            pattern: "^[a-z][a-z0-9-]*$",
          },
          {
            key: "PORT",
            label: "Port",
            description: "HTTP port the service will listen on",
            default: "8080",
            required: false,
          },
        ] as TemplateVariable[],
      },
      {
        name: "python-worker",
        description:
          "Python worker service with FastAPI health endpoint and async task processing",
        language: "python",
        framework: "fastapi",
        tags: ["worker", "backend", "async"],
        repositoryUrl:
          "https://github.com/farm-platform/template-python-worker",
        isBuiltIn: true,
        variables: [
          {
            key: "SERVICE_NAME",
            label: "Service Name",
            description: "Name of the new worker service",
            required: true,
            pattern: "^[a-z][a-z0-9-_]*$",
          },
          {
            key: "QUEUE_NAME",
            label: "Queue Name",
            description: "Name of the message queue to consume from",
            default: "default",
            required: false,
          },
          {
            key: "CONCURRENCY",
            label: "Concurrency",
            description: "Number of concurrent worker threads",
            default: "4",
            required: false,
            pattern: "^[1-9][0-9]*$",
          },
        ] as TemplateVariable[],
      },
    ];

    const entities = this.templateRepository.create(builtInTemplates);
    await this.templateRepository.save(entities);
    this.logger.log(
      `Seeded ${builtInTemplates.length} built-in service templates`,
    );
  }
}
