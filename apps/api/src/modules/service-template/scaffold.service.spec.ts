import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ScaffoldService } from "./scaffold.service";
import { ServiceTemplateService } from "./service-template.service";
import { TemplateEngineService } from "./template-engine.service";
import {
  ScaffoldRequest,
  ScaffoldRequestStatus,
} from "./entities/scaffold-request.entity";
import { ServiceTemplate } from "./entities/service-template.entity";

describe("ScaffoldService", () => {
  let service: ScaffoldService;
  let scaffoldRepo: Record<string, jest.Mock>;
  let templateService: Record<string, jest.Mock>;
  let templateEngine: TemplateEngineService;

  const mockTemplate: ServiceTemplate = {
    id: "tpl-uuid-1",
    name: "nestjs-api",
    description: "NestJS API template",
    language: "typescript",
    framework: "nestjs",
    tags: ["api", "backend"],
    repositoryUrl: "https://github.com/org/nestjs-api-template",
    variables: [
      {
        key: "SERVICE_NAME",
        label: "Service Name",
        description: "Name of the service",
        required: true,
      },
      {
        key: "PORT",
        label: "Port",
        description: "HTTP port",
        default: "3000",
        required: false,
      },
    ],
    isBuiltIn: true,
    organizationId: "org-uuid-1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockScaffoldRequest: ScaffoldRequest = {
    id: "scaffold-uuid-1",
    templateId: "tpl-uuid-1",
    templateName: "nestjs-api",
    targetRepository: "org/new-service",
    variables: { SERVICE_NAME: "my-service", PORT: "3000" },
    status: ScaffoldRequestStatus.COMPLETED,
    statusMessage: "Scaffold completed",
    requestedBy: "user-uuid-1",
    dryRun: false,
    renderedFiles: null,
    organizationId: "org-uuid-1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    scaffoldRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    templateService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScaffoldService,
        TemplateEngineService,
        {
          provide: getRepositoryToken(ScaffoldRequest),
          useValue: scaffoldRepo,
        },
        { provide: ServiceTemplateService, useValue: templateService },
      ],
    }).compile();

    service = module.get<ScaffoldService>(ScaffoldService);
    templateEngine = module.get<TemplateEngineService>(TemplateEngineService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("scaffold", () => {
    it("should scaffold successfully (non-dry-run)", async () => {
      templateService.findOne.mockResolvedValue(mockTemplate);
      const savedInProgress = {
        ...mockScaffoldRequest,
        status: ScaffoldRequestStatus.IN_PROGRESS,
        statusMessage: "Scaffolding in progress",
      };
      scaffoldRepo.create.mockReturnValue(savedInProgress);
      scaffoldRepo.save
        .mockResolvedValueOnce(savedInProgress) // first save (in-progress)
        .mockResolvedValueOnce({
          ...savedInProgress,
          status: ScaffoldRequestStatus.COMPLETED,
        }); // second save (completed)

      const result = await service.scaffold(
        "tpl-uuid-1",
        {
          targetRepository: "org/new-service",
          variables: { SERVICE_NAME: "my-service", PORT: "3000" },
        },
        "user-uuid-1",
        "org-uuid-1",
      );

      expect(templateService.findOne).toHaveBeenCalledWith("tpl-uuid-1");
      expect(scaffoldRepo.create).toHaveBeenCalledTimes(1);
      expect(scaffoldRepo.save).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(ScaffoldRequestStatus.COMPLETED);
    });

    it("should scaffold successfully without organizationId", async () => {
      templateService.findOne.mockResolvedValue(mockTemplate);
      const savedInProgress = {
        ...mockScaffoldRequest,
        organizationId: undefined,
        status: ScaffoldRequestStatus.IN_PROGRESS,
      };
      scaffoldRepo.create.mockReturnValue(savedInProgress);
      scaffoldRepo.save
        .mockResolvedValueOnce(savedInProgress)
        .mockResolvedValueOnce({
          ...savedInProgress,
          status: ScaffoldRequestStatus.COMPLETED,
        });

      const result = await service.scaffold(
        "tpl-uuid-1",
        {
          targetRepository: "org/new-service",
          variables: { SERVICE_NAME: "my-service" },
        },
        "user-uuid-1",
      );

      expect(result).toBeDefined();
      const createArg = (
        scaffoldRepo.create.mock.calls as unknown[][]
      )[0][0] as Partial<ScaffoldRequest>;
      expect(createArg.organizationId).toBeUndefined();
    });

    it("should return dry-run scaffold with rendered files", async () => {
      templateService.findOne.mockResolvedValue(mockTemplate);
      const dryRunResult = {
        ...mockScaffoldRequest,
        dryRun: true,
        status: ScaffoldRequestStatus.COMPLETED,
        statusMessage: "Dry-run completed successfully",
        renderedFiles: [
          "README.md",
          ".gitignore",
          ".editorconfig",
          "Dockerfile",
          "docker-compose.yml",
          "package.json",
          "tsconfig.json",
          "tsconfig.build.json",
          "nest-cli.json",
          "src/main.ts",
          "src/app.module.ts",
          "src/app.controller.ts",
          "src/app.service.ts",
          "src/config/configuration.ts",
          "test/app.e2e-spec.ts",
          "test/jest-e2e.json",
        ],
      };
      scaffoldRepo.create.mockReturnValue(dryRunResult);
      scaffoldRepo.save.mockResolvedValue(dryRunResult);

      const result = await service.scaffold(
        "tpl-uuid-1",
        {
          targetRepository: "org/new-service",
          variables: { SERVICE_NAME: "my-service" },
          dryRun: true,
        },
        "user-uuid-1",
        "org-uuid-1",
      );

      expect(result.dryRun).toBe(true);
      expect(result.status).toBe(ScaffoldRequestStatus.COMPLETED);
      expect(result.statusMessage).toBe("Dry-run completed successfully");
      expect(result.renderedFiles).toBeDefined();
      expect(result.renderedFiles!.length).toBeGreaterThan(0);
      // Only saved once for dry-run (not two saves)
      expect(scaffoldRepo.save).toHaveBeenCalledTimes(1);
    });

    it("should default dryRun to false when not provided", async () => {
      templateService.findOne.mockResolvedValue(mockTemplate);
      const savedInProgress = {
        ...mockScaffoldRequest,
        status: ScaffoldRequestStatus.IN_PROGRESS,
      };
      scaffoldRepo.create.mockReturnValue(savedInProgress);
      scaffoldRepo.save
        .mockResolvedValueOnce(savedInProgress)
        .mockResolvedValueOnce({
          ...savedInProgress,
          status: ScaffoldRequestStatus.COMPLETED,
        });

      await service.scaffold(
        "tpl-uuid-1",
        {
          targetRepository: "org/new-service",
          variables: { SERVICE_NAME: "my-service" },
        },
        "user-uuid-1",
      );

      const createArg = (
        scaffoldRepo.create.mock.calls as unknown[][]
      )[0][0] as Partial<ScaffoldRequest>;
      expect(createArg.dryRun).toBe(false);
    });

    it("should propagate NotFoundException when template does not exist", async () => {
      templateService.findOne.mockRejectedValue(
        new NotFoundException(
          'Service template with ID "nonexistent" not found',
        ),
      );

      await expect(
        service.scaffold(
          "nonexistent",
          { targetRepository: "org/new-service", variables: {} },
          "user-uuid-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when required variables are missing", async () => {
      templateService.findOne.mockResolvedValue(mockTemplate);

      await expect(
        service.scaffold(
          "tpl-uuid-1",
          {
            targetRepository: "org/new-service",
            variables: { PORT: "3000" }, // missing required SERVICE_NAME
          },
          "user-uuid-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("validateVariables", () => {
    it("should pass when all required variables are present", () => {
      expect(() =>
        service.validateVariables(mockTemplate, {
          SERVICE_NAME: "my-service",
          PORT: "3000",
        }),
      ).not.toThrow();
    });

    it("should pass when template has no variables", () => {
      const templateNoVars = { ...mockTemplate, variables: [] };
      expect(() => service.validateVariables(templateNoVars, {})).not.toThrow();
    });

    it("should pass when template variables is null", () => {
      const templateNullVars = { ...mockTemplate, variables: null };
      expect(() =>
        service.validateVariables(templateNullVars, {}),
      ).not.toThrow();
    });

    it("should pass when only required variables are present (optionals omitted)", () => {
      expect(() =>
        service.validateVariables(mockTemplate, {
          SERVICE_NAME: "my-service",
        }),
      ).not.toThrow();
    });

    it("should throw BadRequestException when required variable is missing", () => {
      expect(() =>
        service.validateVariables(mockTemplate, { PORT: "3000" }),
      ).toThrow(BadRequestException);
    });

    it("should throw BadRequestException when required variable has empty value", () => {
      expect(() =>
        service.validateVariables(mockTemplate, {
          SERVICE_NAME: "",
          PORT: "3000",
        }),
      ).toThrow(BadRequestException);
    });

    it("should throw BadRequestException listing all missing variables", () => {
      const templateMultiRequired: ServiceTemplate = {
        ...mockTemplate,
        variables: [
          {
            key: "VAR_A",
            label: "A",
            description: "A",
            required: true,
          },
          {
            key: "VAR_B",
            label: "B",
            description: "B",
            required: true,
          },
          {
            key: "VAR_C",
            label: "C",
            description: "C",
            required: false,
          },
        ],
      };

      expect(() =>
        service.validateVariables(templateMultiRequired, {}),
      ).toThrow("Missing required template variables: VAR_A, VAR_B");
    });

    it("should handle undefined providedVariables", () => {
      expect(() => service.validateVariables(mockTemplate, undefined)).toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when value does not match pattern", () => {
      const templateWithPattern: ServiceTemplate = {
        ...mockTemplate,
        variables: [
          {
            key: "SERVICE_NAME",
            label: "Service Name",
            description: "Name of the service",
            required: true,
            pattern: "^[a-z][a-z0-9-]*$",
          },
        ],
      };

      expect(() =>
        service.validateVariables(templateWithPattern, {
          SERVICE_NAME: "INVALID-NAME",
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        service.validateVariables(templateWithPattern, {
          SERVICE_NAME: "INVALID-NAME",
        }),
      ).toThrow("Template variable validation failed");
    });

    it("should pass when value matches pattern", () => {
      const templateWithPattern: ServiceTemplate = {
        ...mockTemplate,
        variables: [
          {
            key: "SERVICE_NAME",
            label: "Service Name",
            description: "Name of the service",
            required: true,
            pattern: "^[a-z][a-z0-9-]*$",
          },
        ],
      };

      expect(() =>
        service.validateVariables(templateWithPattern, {
          SERVICE_NAME: "my-valid-service",
        }),
      ).not.toThrow();
    });

    it("should skip pattern validation for empty or undefined values", () => {
      const templateWithPattern: ServiceTemplate = {
        ...mockTemplate,
        variables: [
          {
            key: "OPTIONAL_VAR",
            label: "Optional",
            description: "Optional var",
            required: false,
            pattern: "^[a-z]+$",
          },
        ],
      };

      expect(() =>
        service.validateVariables(templateWithPattern, {}),
      ).not.toThrow();
      expect(() =>
        service.validateVariables(templateWithPattern, { OPTIONAL_VAR: "" }),
      ).not.toThrow();
    });

    it("should report multiple pattern violations", () => {
      const templateMultiPattern: ServiceTemplate = {
        ...mockTemplate,
        variables: [
          {
            key: "VAR_A",
            label: "A",
            description: "A",
            required: true,
            pattern: "^[a-z]+$",
          },
          {
            key: "VAR_B",
            label: "B",
            description: "B",
            required: true,
            pattern: "^[0-9]+$",
          },
        ],
      };

      expect(() =>
        service.validateVariables(templateMultiPattern, {
          VAR_A: "INVALID",
          VAR_B: "not-a-number",
        }),
      ).toThrow(/VAR_A must match pattern/);

      expect(() =>
        service.validateVariables(templateMultiPattern, {
          VAR_A: "INVALID",
          VAR_B: "not-a-number",
        }),
      ).toThrow(/VAR_B must match pattern/);
    });
  });

  describe("generateFileTreePreview (via dry-run scaffold)", () => {
    const makeTemplateWithFramework = (framework: string): ServiceTemplate => ({
      ...mockTemplate,
      framework,
      variables: [],
    });

    it("should generate nestjs file tree", async () => {
      const template = makeTemplateWithFramework("nestjs");
      templateService.findOne.mockResolvedValue(template);
      scaffoldRepo.create.mockImplementation((data: ScaffoldRequest) => data);
      scaffoldRepo.save.mockImplementation((data: ScaffoldRequest) =>
        Promise.resolve(data),
      );

      const result = await service.scaffold(
        "tpl-uuid-1",
        { targetRepository: "org/svc", dryRun: true },
        "user-uuid-1",
      );

      expect(result.renderedFiles).toContain("README.md");
      expect(result.renderedFiles).toContain("nest-cli.json");
      expect(result.renderedFiles).toContain("src/main.ts");
      expect(result.renderedFiles).toContain("src/app.module.ts");
    });

    it("should generate nextjs file tree", async () => {
      const template = makeTemplateWithFramework("nextjs");
      templateService.findOne.mockResolvedValue(template);
      scaffoldRepo.create.mockImplementation((data: ScaffoldRequest) => data);
      scaffoldRepo.save.mockImplementation((data: ScaffoldRequest) =>
        Promise.resolve(data),
      );

      const result = await service.scaffold(
        "tpl-uuid-1",
        { targetRepository: "org/svc", dryRun: true },
        "user-uuid-1",
      );

      expect(result.renderedFiles).toContain("next.config.js");
      expect(result.renderedFiles).toContain("tailwind.config.ts");
      expect(result.renderedFiles).toContain("src/app/layout.tsx");
    });

    it("should generate gin file tree with interpolated SERVICE_NAME", async () => {
      const template = makeTemplateWithFramework("gin");
      template.variables = [];
      templateService.findOne.mockResolvedValue(template);
      scaffoldRepo.create.mockImplementation((data: ScaffoldRequest) => data);
      scaffoldRepo.save.mockImplementation((data: ScaffoldRequest) =>
        Promise.resolve(data),
      );

      const result = await service.scaffold(
        "tpl-uuid-1",
        {
          targetRepository: "org/svc",
          variables: { SERVICE_NAME: "my-gin-svc" },
          dryRun: true,
        },
        "user-uuid-1",
      );

      expect(result.renderedFiles).toContain("go.mod");
      expect(result.renderedFiles).toContain("cmd/my-gin-svc/main.go");
      expect(result.renderedFiles).toContain("internal/handler/health.go");
    });

    it("should generate fastapi file tree with interpolated SERVICE_NAME", async () => {
      const template = makeTemplateWithFramework("fastapi");
      template.variables = [];
      templateService.findOne.mockResolvedValue(template);
      scaffoldRepo.create.mockImplementation((data: ScaffoldRequest) => data);
      scaffoldRepo.save.mockImplementation((data: ScaffoldRequest) =>
        Promise.resolve(data),
      );

      const result = await service.scaffold(
        "tpl-uuid-1",
        {
          targetRepository: "org/svc",
          variables: { SERVICE_NAME: "my-worker" },
          dryRun: true,
        },
        "user-uuid-1",
      );

      expect(result.renderedFiles).toContain("pyproject.toml");
      expect(result.renderedFiles).toContain("my-worker/__init__.py");
      expect(result.renderedFiles).toContain("my-worker/worker.py");
    });

    it("should fall back to nestjs file tree for unknown framework", async () => {
      const template = makeTemplateWithFramework("unknown-framework");
      template.variables = [];
      templateService.findOne.mockResolvedValue(template);
      scaffoldRepo.create.mockImplementation((data: ScaffoldRequest) => data);
      scaffoldRepo.save.mockImplementation((data: ScaffoldRequest) =>
        Promise.resolve(data),
      );

      const result = await service.scaffold(
        "tpl-uuid-1",
        { targetRepository: "org/svc", dryRun: true },
        "user-uuid-1",
      );

      // Should fall back to nestjs files
      expect(result.renderedFiles).toContain("nest-cli.json");
      expect(result.renderedFiles).toContain("src/main.ts");
    });

    it("should use APP_NAME when SERVICE_NAME is not provided", async () => {
      const template = makeTemplateWithFramework("gin");
      template.variables = [];
      templateService.findOne.mockResolvedValue(template);
      scaffoldRepo.create.mockImplementation((data: ScaffoldRequest) => data);
      scaffoldRepo.save.mockImplementation((data: ScaffoldRequest) =>
        Promise.resolve(data),
      );

      const result = await service.scaffold(
        "tpl-uuid-1",
        {
          targetRepository: "org/svc",
          variables: { APP_NAME: "my-app" },
          dryRun: true,
        },
        "user-uuid-1",
      );

      expect(result.renderedFiles).toContain("cmd/my-app/main.go");
    });

    it("should use 'my-service' as default name when no variables provided", async () => {
      const template = makeTemplateWithFramework("gin");
      template.variables = [];
      templateService.findOne.mockResolvedValue(template);
      scaffoldRepo.create.mockImplementation((data: ScaffoldRequest) => data);
      scaffoldRepo.save.mockImplementation((data: ScaffoldRequest) =>
        Promise.resolve(data),
      );

      const result = await service.scaffold(
        "tpl-uuid-1",
        { targetRepository: "org/svc", dryRun: true },
        "user-uuid-1",
      );

      expect(result.renderedFiles).toContain("cmd/my-service/main.go");
    });

    it("should always include common files", async () => {
      const template = makeTemplateWithFramework("nestjs");
      template.variables = [];
      templateService.findOne.mockResolvedValue(template);
      scaffoldRepo.create.mockImplementation((data: ScaffoldRequest) => data);
      scaffoldRepo.save.mockImplementation((data: ScaffoldRequest) =>
        Promise.resolve(data),
      );

      const result = await service.scaffold(
        "tpl-uuid-1",
        { targetRepository: "org/svc", dryRun: true },
        "user-uuid-1",
      );

      const commonFiles = [
        "README.md",
        ".gitignore",
        ".editorconfig",
        "Dockerfile",
        "docker-compose.yml",
      ];
      for (const file of commonFiles) {
        expect(result.renderedFiles).toContain(file);
      }
    });
  });

  describe("dryRun", () => {
    const noVarsTemplate: ServiceTemplate = {
      ...mockTemplate,
      variables: [],
    };

    it("should return valid=true when all required variables provided", async () => {
      templateService.findOne.mockResolvedValue(mockTemplate);

      const result = await service.dryRun("tpl-uuid-1", {
        SERVICE_NAME: "my-service",
        PORT: "3000",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.preview).toBeTruthy();
    });

    it("should return valid=false with errors when required variables missing", async () => {
      templateService.findOne.mockResolvedValue(mockTemplate);

      const result = await service.dryRun("tpl-uuid-1", {});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/Missing required template variables/);
    });

    it("should return valid=false with errors when pattern validation fails", async () => {
      const templateWithPattern: ServiceTemplate = {
        ...mockTemplate,
        variables: [
          {
            key: "SERVICE_NAME",
            label: "Service Name",
            description: "Name",
            required: true,
            pattern: "^[a-z][a-z0-9-]*$",
          },
        ],
      };
      templateService.findOne.mockResolvedValue(templateWithPattern);

      const result = await service.dryRun("tpl-uuid-1", {
        SERVICE_NAME: "INVALID_NAME",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/must match pattern/);
    });

    it("should truncate preview to 8192 characters", async () => {
      // Use a template engine spy to return a very long string
      templateService.findOne.mockResolvedValue(noVarsTemplate);
      const longString = "x".repeat(10000);
      jest.spyOn(templateEngine, "render").mockReturnValue(longString);

      const result = await service.dryRun("tpl-uuid-1", {});

      expect(result.preview.length).toBeLessThanOrEqual(8192);
    });

    it("should work when template has no variables", async () => {
      templateService.findOne.mockResolvedValue(noVarsTemplate);

      const result = await service.dryRun("tpl-uuid-1", {});

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.preview).toBeTruthy();
    });

    it("should catch rendering errors and return them in errors array instead of throwing", async () => {
      templateService.findOne.mockResolvedValue(noVarsTemplate);
      jest
        .spyOn(templateEngine, "render")
        .mockImplementation(() => {
          throw new BadRequestException("Template rendering failed: invalid syntax");
        });

      const result = await service.dryRun("tpl-uuid-1", {});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/rendering failed/i),
        ]),
      );
    });

    it("should not include variable values in the preview output", async () => {
      templateService.findOne.mockResolvedValue(mockTemplate);

      const result = await service.dryRun("tpl-uuid-1", {
        SERVICE_NAME: "secret-service",
        PORT: "3000",
      });

      expect(result.preview).not.toContain('"secret-service"');
      expect(result.preview).not.toContain('"3000"');
      expect(result.preview).not.toContain("dump");
    });
  });
});
