import { Test, TestingModule } from "@nestjs/testing";
import { ServiceTemplateController } from "./service-template.controller";
import { ServiceTemplateService } from "./service-template.service";
import { ScaffoldService } from "./scaffold.service";
import { ServiceTemplate } from "./entities/service-template.entity";
import {
  ScaffoldRequest,
  ScaffoldRequestStatus,
} from "./entities/scaffold-request.entity";
import { CreateServiceTemplateDto } from "./dto/create-service-template.dto";
import { UpdateServiceTemplateDto } from "./dto/update-service-template.dto";
import { DryRunResultDto } from "./dto/dry-run-result.dto";
import { PaginatedResponseDto } from "../../common/dto";

const mockTemplateService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockScaffoldService = {
  scaffold: jest.fn(),
  dryRun: jest.fn(),
};

describe("ServiceTemplateController", () => {
  let controller: ServiceTemplateController;
  let templateService: typeof mockTemplateService;
  let scaffoldService: typeof mockScaffoldService;

  const mockTemplate: ServiceTemplate = {
    id: "tpl-uuid-1",
    name: "nestjs-api",
    description: "NestJS API template",
    language: "typescript",
    framework: "nestjs",
    tags: ["api", "backend"],
    repositoryUrl: "https://github.com/org/nestjs-api-template",
    variables: [],
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
    variables: { SERVICE_NAME: "my-service" },
    status: ScaffoldRequestStatus.COMPLETED,
    statusMessage: "Scaffold completed",
    requestedBy: "user-uuid-1",
    dryRun: false,
    renderedFiles: null,
    organizationId: "org-uuid-1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockDryRunResult: DryRunResultDto = {
    valid: true,
    errors: [],
    preview: "# nestjs-api Preview\nFiles to be created:\n- README.md",
  };

  const mockRequest = {
    user: { userId: "user-uuid-1" },
    organizationId: "org-uuid-1",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceTemplateController],
      providers: [
        { provide: ServiceTemplateService, useValue: mockTemplateService },
        { provide: ScaffoldService, useValue: mockScaffoldService },
      ],
    }).compile();

    controller = module.get<ServiceTemplateController>(
      ServiceTemplateController,
    );
    templateService = module.get(ServiceTemplateService);
    scaffoldService = module.get(ScaffoldService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST / (create)", () => {
    it("should create a service template", async () => {
      const dto: CreateServiceTemplateDto = {
        name: "nestjs-api",
        language: "typescript",
        framework: "nestjs",
        repositoryUrl: "https://github.com/org/nestjs-api-template",
      };
      templateService.create.mockResolvedValue(mockTemplate);

      const result = await controller.create(mockRequest as never, dto);

      expect(result).toEqual(mockTemplate);
      expect(templateService.create).toHaveBeenCalledWith(dto, "org-uuid-1");
    });
  });

  describe("GET / (findAll)", () => {
    it("should list templates with pagination", async () => {
      templateService.findAll.mockResolvedValue([[mockTemplate], 1]);

      const result = await controller.findAll({ skip: 0, take: 20 });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual([mockTemplate]);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it("should default skip to 0 and take to 20 when query values are undefined", async () => {
      templateService.findAll.mockResolvedValue([[mockTemplate], 1]);

      const result = await controller.findAll({
        skip: undefined,
        take: undefined,
      });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });
  });

  describe("GET /:id (findOne)", () => {
    it("should get a template by ID", async () => {
      templateService.findOne.mockResolvedValue(mockTemplate);

      const result = await controller.findOne("tpl-uuid-1");

      expect(result).toEqual(mockTemplate);
      expect(templateService.findOne).toHaveBeenCalledWith("tpl-uuid-1");
    });
  });

  describe("PATCH /:id (update)", () => {
    it("should update a service template", async () => {
      const updateDto: UpdateServiceTemplateDto = {
        description: "Updated description",
      };
      templateService.update.mockResolvedValue({
        ...mockTemplate,
        description: "Updated description",
      });

      const result = await controller.update("tpl-uuid-1", updateDto);

      expect(result.description).toBe("Updated description");
      expect(templateService.update).toHaveBeenCalledWith(
        "tpl-uuid-1",
        updateDto,
      );
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should remove a service template", async () => {
      templateService.remove.mockResolvedValue(undefined);

      const result = await controller.remove("tpl-uuid-1");

      expect(result).toBeUndefined();
      expect(templateService.remove).toHaveBeenCalledWith("tpl-uuid-1");
    });
  });

  describe("POST /:id/scaffold", () => {
    it("should scaffold a new service from a template", async () => {
      scaffoldService.scaffold.mockResolvedValue(mockScaffoldRequest);

      const dto = {
        targetRepository: "org/new-service",
        variables: { SERVICE_NAME: "my-service" },
      };
      const result = await controller.scaffold(
        "tpl-uuid-1",
        mockRequest as never,
        dto,
      );

      expect(result).toEqual(mockScaffoldRequest);
      expect(scaffoldService.scaffold).toHaveBeenCalledWith(
        "tpl-uuid-1",
        dto,
        "user-uuid-1",
        "org-uuid-1",
      );
    });
  });

  describe("POST /:id/scaffold/dry-run", () => {
    it("should scaffold dry-run from a template", async () => {
      const dryRunResult = {
        ...mockScaffoldRequest,
        dryRun: true,
        renderedFiles: ["README.md", "package.json"],
      };
      scaffoldService.scaffold.mockResolvedValue(dryRunResult);

      const dto = {
        targetRepository: "org/new-service",
        variables: { SERVICE_NAME: "my-service" },
      };
      const result = await controller.scaffoldDryRun(
        "tpl-uuid-1",
        mockRequest as never,
        dto,
      );

      expect(result.dryRun).toBe(true);
      expect(result.renderedFiles).toBeDefined();
      expect(scaffoldService.scaffold).toHaveBeenCalledWith(
        "tpl-uuid-1",
        { ...dto, dryRun: true },
        "user-uuid-1",
        "org-uuid-1",
      );
    });
  });

  describe("POST /:id/dry-run", () => {
    it("should call scaffoldService.dryRun with provided variables", async () => {
      scaffoldService.dryRun.mockResolvedValue(mockDryRunResult);

      const dto = { variables: { SERVICE_NAME: "my-service" } };
      const result = await controller.dryRun("tpl-uuid-1", dto);

      expect(result).toEqual(mockDryRunResult);
      expect(scaffoldService.dryRun).toHaveBeenCalledWith("tpl-uuid-1", {
        SERVICE_NAME: "my-service",
      });
    });

    it("should call scaffoldService.dryRun with undefined variables when body is empty", async () => {
      const invalidResult: DryRunResultDto = {
        valid: false,
        errors: ["Missing required template variables: SERVICE_NAME"],
        preview: "# nestjs-api Preview",
      };
      scaffoldService.dryRun.mockResolvedValue(invalidResult);

      const result = await controller.dryRun("tpl-uuid-1", {});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(scaffoldService.dryRun).toHaveBeenCalledWith(
        "tpl-uuid-1",
        undefined,
      );
    });

    it("should return valid=true result when all variables are valid", async () => {
      scaffoldService.dryRun.mockResolvedValue(mockDryRunResult);

      const result = await controller.dryRun("tpl-uuid-1", {
        variables: { SERVICE_NAME: "valid-service" },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("GET /:id/preview", () => {
    it("should decode base64url vars and call scaffoldService.dryRun", async () => {
      scaffoldService.dryRun.mockResolvedValue(mockDryRunResult);
      const vars = Buffer.from(
        JSON.stringify({ SERVICE_NAME: "my-service" }),
      ).toString("base64url");

      const result = await controller.preview("tpl-uuid-1", { vars });

      expect(result).toEqual(mockDryRunResult);
      expect(scaffoldService.dryRun).toHaveBeenCalledWith("tpl-uuid-1", {
        SERVICE_NAME: "my-service",
      });
    });

    it("should treat invalid base64 as empty vars without throwing", async () => {
      scaffoldService.dryRun.mockResolvedValue(mockDryRunResult);

      const result = await controller.preview("tpl-uuid-1", {
        vars: "!!!not-valid-base64!!!",
      });

      expect(result).toEqual(mockDryRunResult);
      expect(scaffoldService.dryRun).toHaveBeenCalledWith(
        "tpl-uuid-1",
        undefined,
      );
    });

    it("should call scaffoldService.dryRun with undefined when vars query param is absent", async () => {
      scaffoldService.dryRun.mockResolvedValue(mockDryRunResult);

      const result = await controller.preview("tpl-uuid-1", {});

      expect(result).toEqual(mockDryRunResult);
      expect(scaffoldService.dryRun).toHaveBeenCalledWith(
        "tpl-uuid-1",
        undefined,
      );
    });

    it("should treat valid base64url with invalid JSON as empty vars", async () => {
      scaffoldService.dryRun.mockResolvedValue(mockDryRunResult);
      // Valid base64url but not valid JSON
      const vars = Buffer.from("not-json-content").toString("base64url");

      const result = await controller.preview("tpl-uuid-1", { vars });

      expect(result).toEqual(mockDryRunResult);
      expect(scaffoldService.dryRun).toHaveBeenCalledWith(
        "tpl-uuid-1",
        undefined,
      );
    });
  });
});
