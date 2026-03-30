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

      const result = await controller.create(mockRequest as any, dto);

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
        mockRequest as any,
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
        mockRequest as any,
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
});
