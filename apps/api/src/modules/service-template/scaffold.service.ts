import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import {
  ScaffoldRequest,
  ScaffoldRequestStatus,
} from "./entities/scaffold-request.entity";
import { ServiceTemplate } from "./entities/service-template.entity";
import { CreateScaffoldRequestDto } from "./dto/scaffold-request.dto";
import { DryRunResultDto } from "./dto/dry-run-result.dto";
import { ServiceTemplateService } from "./service-template.service";
import { TemplateEngineService } from "./template-engine.service";

/** Maximum character length for the rendered preview string. */
const PREVIEW_MAX_LENGTH = 8192;

/**
 * Service responsible for scaffolding new projects from service templates.
 * Handles variable validation, dry-run previews, and scaffold execution.
 */
@Injectable()
export class ScaffoldService {
  private readonly logger = new Logger(ScaffoldService.name);

  constructor(
    @InjectRepository(ScaffoldRequest)
    private readonly scaffoldRepository: Repository<ScaffoldRequest>,
    private readonly serviceTemplateService: ServiceTemplateService,
    private readonly templateEngine: TemplateEngineService,
  ) {}

  /**
   * Scaffolds a new service from a template.
   * @param templateId - UUID of the template to scaffold from
   * @param dto - Scaffold request data (target repository, variables, dryRun flag)
   * @param userId - UUID of the requesting user
   * @param organizationId - Optional organization scope
   * @returns The created scaffold request with status and results
   * @throws NotFoundException if the template does not exist
   * @throws BadRequestException if required variables are missing
   */
  async scaffold(
    templateId: string,
    dto: CreateScaffoldRequestDto,
    userId: string,
    organizationId?: string,
  ): Promise<ScaffoldRequest> {
    const template = await this.serviceTemplateService.findOne(templateId);

    this.validateVariables(template, dto.variables);

    const dryRun = dto.dryRun ?? false;

    if (dryRun) {
      const renderedFiles = this.generateFileTreePreview(
        template,
        dto.variables,
      );

      const data: DeepPartial<ScaffoldRequest> = {
        templateId: template.id,
        templateName: template.name,
        targetRepository: dto.targetRepository,
        variables: dto.variables,
        status: ScaffoldRequestStatus.COMPLETED,
        statusMessage: "Dry-run completed successfully",
        requestedBy: userId,
        dryRun: true,
        renderedFiles,
        organizationId,
      };

      const request = this.scaffoldRepository.create(data);
      const saved = await this.scaffoldRepository.save(request);
      this.logger.log(
        `Dry-run scaffold completed for template "${template.name}" -> ${dto.targetRepository}`,
      );
      return saved;
    }

    const data: DeepPartial<ScaffoldRequest> = {
      templateId: template.id,
      templateName: template.name,
      targetRepository: dto.targetRepository,
      variables: dto.variables,
      status: ScaffoldRequestStatus.IN_PROGRESS,
      statusMessage: "Scaffolding in progress",
      requestedBy: userId,
      dryRun: false,
      organizationId,
    };

    const request = this.scaffoldRepository.create(data);
    const saved = await this.scaffoldRepository.save(request);
    this.logger.log(
      `Scaffold started for template "${template.name}" -> ${dto.targetRepository}`,
    );

    // Simulate scaffold execution (no actual repository creation)
    saved.status = ScaffoldRequestStatus.COMPLETED;
    saved.statusMessage = `Repository "${dto.targetRepository}" scaffolded successfully from template "${template.name}"`;

    const completed = await this.scaffoldRepository.save(saved);
    this.logger.log(
      `Scaffold completed for template "${template.name}" -> ${dto.targetRepository}`,
    );
    return completed;
  }

  /**
   * Validates that all required template variables have been provided
   * and that values match any defined regex patterns.
   * @param template - The service template containing variable definitions
   * @param providedVariables - Key-value pairs provided by the user
   * @throws BadRequestException listing all missing required variables
   * @throws BadRequestException listing all pattern violations
   */
  validateVariables(
    template: ServiceTemplate,
    providedVariables?: Record<string, string>,
  ): void {
    if (!template.variables || template.variables.length === 0) {
      return;
    }

    const provided = providedVariables ?? {};
    const missingVariables = template.variables
      .filter(
        (v) =>
          v.required &&
          (provided[v.key] === undefined || provided[v.key] === ""),
      )
      .map((v) => v.key);

    if (missingVariables.length > 0) {
      throw new BadRequestException(
        `Missing required template variables: ${missingVariables.join(", ")}`,
      );
    }

    const patternViolations = template.variables
      .filter(
        (v) =>
          v.pattern &&
          provided[v.key] !== undefined &&
          provided[v.key] !== "" &&
          !new RegExp(v.pattern).test(provided[v.key]),
      )
      .map((v) => `${v.key} must match pattern ${v.pattern}`);

    if (patternViolations.length > 0) {
      throw new BadRequestException(
        `Template variable validation failed: ${patternViolations.join("; ")}`,
      );
    }
  }

  /**
   * Performs a dry-run validation of a template against provided variables.
   * Collects all validation errors instead of throwing, and renders a
   * representative preview string using the Nunjucks template engine.
   * @param templateId - UUID of the template to validate
   * @param variables - Key-value pairs of template variables to validate
   * @returns A DryRunResultDto with validity status, errors, and preview
   */
  async dryRun(
    templateId: string,
    variables?: Record<string, string>,
  ): Promise<DryRunResultDto> {
    const template = await this.serviceTemplateService.findOne(templateId);
    const provided = variables ?? {};
    const errors: string[] = [];

    // Collect missing required variable errors without throwing
    if (template.variables && template.variables.length > 0) {
      const missingVariables = template.variables
        .filter(
          (v) =>
            v.required &&
            (provided[v.key] === undefined || provided[v.key] === ""),
        )
        .map((v) => v.key);

      if (missingVariables.length > 0) {
        errors.push(
          `Missing required template variables: ${missingVariables.join(", ")}`,
        );
      }

      // Collect pattern violations without throwing
      const patternViolations = template.variables
        .filter(
          (v) =>
            v.pattern &&
            provided[v.key] !== undefined &&
            provided[v.key] !== "" &&
            !new RegExp(v.pattern).test(provided[v.key]),
        )
        .map((v) => `${v.key} must match pattern ${v.pattern}`);

      if (patternViolations.length > 0) {
        errors.push(
          `Template variable validation failed: ${patternViolations.join("; ")}`,
        );
      }
    }

    let files: string[] = [];
    try {
      files = this.generateFileTreePreview(template, variables);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`File tree rendering failed: ${message}`);
    }

    const previewTemplate = [
      "# {{ name }} Preview",
      "Files to be created:",
      "{% for f in files %}",
      "- {{ f }}",
      "{% endfor %}",
    ].join("\n");

    let rendered = "";
    try {
      rendered = this.templateEngine.render(previewTemplate, {
        name: template.name,
        files,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Preview rendering failed: ${message}`);
    }

    const preview =
      rendered.length > PREVIEW_MAX_LENGTH
        ? rendered.slice(0, PREVIEW_MAX_LENGTH)
        : rendered;

    return { valid: errors.length === 0, errors, preview };
  }

  /**
   * Generates a simulated file tree preview for a dry-run scaffold.
   * The file structure varies based on the template's language and framework.
   * File paths that contain Nunjucks syntax are rendered using the template engine.
   * @param template - The service template
   * @param variables - User-provided variables for path interpolation
   * @returns Array of file paths representing the scaffolded project structure
   */
  protected generateFileTreePreview(
    template: ServiceTemplate,
    variables?: Record<string, string>,
  ): string[] {
    const vars: Record<string, unknown> = {
      ...(variables ?? {}),
      SERVICE_NAME:
        variables?.SERVICE_NAME ?? variables?.APP_NAME ?? "my-service",
    };

    const commonFiles = [
      "README.md",
      ".gitignore",
      ".editorconfig",
      "Dockerfile",
      "docker-compose.yml",
    ];

    const frameworkFiles: Record<string, string[]> = {
      nestjs: [
        "package.json",
        "tsconfig.json",
        "tsconfig.build.json",
        "nest-cli.json",
        `src/main.ts`,
        `src/app.module.ts`,
        `src/app.controller.ts`,
        `src/app.service.ts`,
        `src/config/configuration.ts`,
        `test/app.e2e-spec.ts`,
        `test/jest-e2e.json`,
      ],
      nextjs: [
        "package.json",
        "tsconfig.json",
        "next.config.js",
        "tailwind.config.ts",
        `src/app/layout.tsx`,
        `src/app/page.tsx`,
        `src/app/globals.css`,
        `src/components/.gitkeep`,
        `public/favicon.ico`,
      ],
      gin: [
        "go.mod",
        "go.sum",
        "Makefile",
        `cmd/{{ SERVICE_NAME | default("my-service") }}/main.go`,
        `internal/handler/health.go`,
        `internal/handler/router.go`,
        `internal/config/config.go`,
        `internal/middleware/logging.go`,
      ],
      fastapi: [
        "pyproject.toml",
        "requirements.txt",
        "Makefile",
        `{{ SERVICE_NAME | default("my-service") }}/__init__.py`,
        `{{ SERVICE_NAME | default("my-service") }}/main.py`,
        `{{ SERVICE_NAME | default("my-service") }}/worker.py`,
        `{{ SERVICE_NAME | default("my-service") }}/config.py`,
        `tests/__init__.py`,
        `tests/test_worker.py`,
      ],
    };

    const rawFiles =
      frameworkFiles[template.framework] ?? frameworkFiles["nestjs"];

    const renderedFiles = rawFiles.map((path) => {
      if (!path.includes("{{")) {
        return path;
      }
      return this.templateEngine.render(path, vars);
    });

    return [...commonFiles, ...renderedFiles];
  }
}
