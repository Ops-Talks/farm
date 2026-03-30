import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ServiceTemplateService } from "./service-template.service";
import { ServiceTemplate } from "./entities/service-template.entity";
import { CreateServiceTemplateDto } from "./dto/create-service-template.dto";
import { ListTemplatesQueryDto } from "./dto/list-templates-query.dto";

describe("ServiceTemplateService", () => {
  let service: ServiceTemplateService;
  let repo: Record<string, jest.Mock>;

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

  const createDto: CreateServiceTemplateDto = {
    name: "nestjs-api",
    description: "NestJS API template",
    language: "typescript",
    framework: "nestjs",
    tags: ["api", "backend"],
    repositoryUrl: "https://github.com/org/nestjs-api-template",
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceTemplateService,
        { provide: getRepositoryToken(ServiceTemplate), useValue: repo },
      ],
    }).compile();

    service = module.get<ServiceTemplateService>(ServiceTemplateService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a service template successfully", async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockTemplate);
      repo.save.mockResolvedValue(mockTemplate);

      const result = await service.create(createDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name },
      });
      expect(repo.create).toHaveBeenCalledWith({
        ...createDto,
        organizationId: undefined,
      });
      expect(repo.save).toHaveBeenCalledWith(mockTemplate);
      expect(result).toEqual(mockTemplate);
    });

    it("should use the provided organizationId parameter over dto value", async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockTemplate);
      repo.save.mockResolvedValue(mockTemplate);

      await service.create(createDto, "org-override");

      expect(repo.create).toHaveBeenCalledWith({
        ...createDto,
        organizationId: "org-override",
      });
    });

    it("should fall back to dto organizationId when parameter is not provided", async () => {
      const dtoWithOrg = { ...createDto, organizationId: "org-from-dto" };
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockTemplate);
      repo.save.mockResolvedValue(mockTemplate);

      await service.create(dtoWithOrg);

      expect(repo.create).toHaveBeenCalledWith({
        ...dtoWithOrg,
        organizationId: "org-from-dto",
      });
    });

    it("should throw ConflictException when name already exists", async () => {
      repo.findOne.mockResolvedValue(mockTemplate);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        `Service template with name "${createDto.name}" already exists`,
      );
    });
  });

  describe("findAll", () => {
    it("should findAll with no filters", async () => {
      repo.findAndCount.mockResolvedValue([[mockTemplate], 1]);

      const query = new ListTemplatesQueryDto();
      const result = await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual([[mockTemplate], 1]);
    });

    it("should findAll with language filter", async () => {
      repo.findAndCount.mockResolvedValue([[mockTemplate], 1]);

      const query = Object.assign(new ListTemplatesQueryDto(), {
        language: "typescript",
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { language: "typescript" },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should findAll with framework filter", async () => {
      repo.findAndCount.mockResolvedValue([[mockTemplate], 1]);

      const query = Object.assign(new ListTemplatesQueryDto(), {
        framework: "nestjs",
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { framework: "nestjs" },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should findAll with organizationId filter", async () => {
      repo.findAndCount.mockResolvedValue([[mockTemplate], 1]);

      const query = Object.assign(new ListTemplatesQueryDto(), {
        organizationId: "org-uuid-1",
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: "org-uuid-1" },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should apply all filters and custom pagination", async () => {
      repo.findAndCount.mockResolvedValue([[mockTemplate], 1]);

      const query = Object.assign(new ListTemplatesQueryDto(), {
        language: "go",
        framework: "gin",
        organizationId: "org-uuid-2",
        skip: 10,
        take: 5,
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {
          language: "go",
          framework: "gin",
          organizationId: "org-uuid-2",
        },
        order: { createdAt: "DESC" },
        skip: 10,
        take: 5,
      });
    });
  });

  describe("findOne", () => {
    it("should findOne successfully", async () => {
      repo.findOne.mockResolvedValue(mockTemplate);

      const result = await service.findOne("tpl-uuid-1");

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "tpl-uuid-1" },
      });
      expect(result).toEqual(mockTemplate);
    });

    it("should throw NotFoundException when template not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne("nonexistent")).rejects.toThrow(
        'Service template with ID "nonexistent" not found',
      );
    });
  });

  describe("update", () => {
    it("should update a template successfully", async () => {
      repo.findOne.mockResolvedValue(mockTemplate);
      repo.merge.mockReturnValue({
        ...mockTemplate,
        description: "Updated description",
      });
      repo.save.mockResolvedValue({
        ...mockTemplate,
        description: "Updated description",
      });

      const result = await service.update("tpl-uuid-1", {
        description: "Updated description",
      });

      expect(result.description).toBe("Updated description");
    });

    it("should skip name conflict check when the name equals the current name", async () => {
      repo.findOne.mockResolvedValue(mockTemplate);
      repo.merge.mockReturnValue({ ...mockTemplate });
      repo.save.mockResolvedValue(mockTemplate);

      await service.update("tpl-uuid-1", { name: mockTemplate.name });

      // findOne called once for findOne(id), no second call for name conflict
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it("should update with a new name when no conflicting template exists", async () => {
      repo.findOne
        .mockResolvedValueOnce(mockTemplate) // findOne for template lookup
        .mockResolvedValueOnce(null); // findOne for name conflict check
      repo.merge.mockReturnValue({ ...mockTemplate, name: "new-name" });
      repo.save.mockResolvedValue({ ...mockTemplate, name: "new-name" });

      const result = await service.update("tpl-uuid-1", { name: "new-name" });

      expect(result.name).toBe("new-name");
      expect(repo.findOne).toHaveBeenCalledTimes(2);
    });

    it("should throw ConflictException on update when name conflicts", async () => {
      const otherTemplate = {
        ...mockTemplate,
        id: "tpl-uuid-2",
        name: "other-template",
      };
      repo.findOne
        .mockResolvedValueOnce(mockTemplate)
        .mockResolvedValueOnce(otherTemplate);

      await expect(
        service.update("tpl-uuid-1", { name: "other-template" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException if template to update does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { description: "nope" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove a template", async () => {
      repo.findOne.mockResolvedValue(mockTemplate);
      repo.remove.mockResolvedValue(undefined);

      await expect(service.remove("tpl-uuid-1")).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(mockTemplate);
    });

    it("should throw NotFoundException if template to remove does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("seedBuiltInTemplates", () => {
    it("should seed built-in templates when none exist", async () => {
      repo.count.mockResolvedValue(0);
      repo.create.mockReturnValue([]);
      repo.save.mockResolvedValue([]);

      await service.seedBuiltInTemplates();

      expect(repo.count).toHaveBeenCalledWith({
        where: { isBuiltIn: true },
      });
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledTimes(1);

      // Verify that 4 built-in templates are seeded
      const createArg = (
        repo.create.mock.calls as unknown[][]
      )[0][0] as Partial<ServiceTemplate>[];
      expect(createArg).toHaveLength(4);
      expect(createArg.map((t) => t.name)).toEqual([
        "nestjs-api",
        "nextjs-app",
        "go-microservice",
        "python-worker",
      ]);
    });

    it("should skip seeding when built-in templates already exist", async () => {
      repo.count.mockResolvedValue(4);

      await service.seedBuiltInTemplates();

      expect(repo.count).toHaveBeenCalledWith({
        where: { isBuiltIn: true },
      });
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("should skip seeding when at least one built-in template exists", async () => {
      repo.count.mockResolvedValue(1);

      await service.seedBuiltInTemplates();

      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
