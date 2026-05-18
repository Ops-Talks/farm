import { Test, TestingModule } from "@nestjs/testing";
import { DocumentationController } from "./documentation.controller";
import { DocumentationService } from "./documentation.service";
import { DocumentationBuildService } from "./documentation-build.service";
import { PaginatedResponseDto } from "../../common/dto";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";

describe("DocumentationController", () => {
  let controller: DocumentationController;
  let service: DocumentationService;
  let buildService: DocumentationBuildService;

  const mockBuild = {
    id: "build-uuid-1",
    componentId: "comp-uuid-1",
    version: "1.0.0",
    sourceType: "markdown" as const,
    status: "ready" as const,
    buildLog: null,
    artifactsPath: null,
    triggeredAt: new Date("2024-01-01T00:00:00Z"),
    completedAt: null,
  };

  const mockDoc = {
    id: "doc-uuid-1",
    title: "Getting Started",
    sourceUrl: "https://raw.githubusercontent.com/org/repo/main/README.md",
    componentId: "comp-uuid-1",
    author: "john_doe",
    version: "1.0.0",
    parentId: null,
    order: 0,
    organizationId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentationController],
      providers: [
        {
          provide: DocumentationService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockDoc),
            findAll: jest.fn().mockResolvedValue([[mockDoc], 1]),
            findByComponent: jest.fn().mockResolvedValue([mockDoc]),
            findOne: jest.fn().mockResolvedValue(mockDoc),
            getContent: jest.fn().mockResolvedValue("# Hello World"),
            renderContent: jest
              .fn()
              .mockResolvedValue("<h1>Hello World</h1>\n"),
            buildTree: jest.fn().mockResolvedValue([
              {
                id: "doc-uuid-1",
                title: "Getting Started",
                parentId: null,
                order: 0,
                children: [],
              },
            ]),
            search: jest.fn().mockResolvedValue([
              {
                id: "doc-uuid-1",
                title: "Getting Started",
                componentId: "comp-uuid-1",
                score: 0.5,
              },
            ]),
            update: jest.fn().mockResolvedValue(mockDoc),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DocumentationBuildService,
          useValue: {
            findByComponent: jest.fn().mockResolvedValue([mockBuild]),
            findVersions: jest.fn().mockResolvedValue([mockBuild]),
          },
        },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DocumentationController>(DocumentationController);
    service = module.get<DocumentationService>(DocumentationService);
    buildService = module.get<DocumentationBuildService>(
      DocumentationBuildService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a documentation entry", async () => {
      const result = await controller.create(
        {
          title: "Getting Started",
          sourceUrl:
            "https://raw.githubusercontent.com/org/repo/main/README.md",
          componentId: "comp-uuid-1",
          author: "john_doe",
          version: "1.0.0",
        },
        { organizationId: "org-uuid-1" },
      );
      expect(result).toEqual(mockDoc);
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Getting Started" }),
        "org-uuid-1",
      );
    });
  });

  describe("findAll", () => {
    it("should return all documentation entries with pagination", async () => {
      const result = await controller.findAll({ skip: 0, take: 20 }, {});
      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
      expect(service.findAll).toHaveBeenCalledWith(0, 20, undefined, undefined);
    });

    it("should filter by componentId when provided", async () => {
      const result = await controller.findAll(
        {
          skip: 0,
          take: 20,
          componentId: "comp-uuid-1",
        },
        {},
      );
      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith(
        0,
        20,
        "comp-uuid-1",
        undefined,
      );
    });

    it("should use skip=0 and take=20 defaults when query properties are undefined", async () => {
      const result = await controller.findAll(
        {
          skip: undefined,
          take: undefined,
        },
        {},
      );
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });
  });

  describe("findOne", () => {
    it("should return one documentation entry by ID", async () => {
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
      const result = await controller.findOne("doc-uuid-1", mockReq);
      expect(result).toEqual(mockDoc);
      expect(service.findOne).toHaveBeenCalledWith("doc-uuid-1", "org-uuid");
    });
  });

  describe("getContent", () => {
    it("should return markdown content", async () => {
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
      const result = await controller.getContent("doc-uuid-1", mockReq);
      expect(result).toBe("# Hello World");
      expect(service.getContent).toHaveBeenCalledWith("doc-uuid-1", "org-uuid");
    });
  });

  describe("getRendered", () => {
    it("should return rendered HTML content", async () => {
      const result = await controller.getRendered("doc-uuid-1");
      expect(result).toContain("<h1>");
      expect(service.renderContent).toHaveBeenCalledWith("doc-uuid-1");
    });
  });

  describe("getTree", () => {
    it("should return documentation navigation tree", async () => {
      const result = await controller.getTree("comp-uuid-1");
      expect(result).toHaveLength(1);
      expect(Array.isArray(result[0].children)).toBe(true);
      expect(service.buildTree).toHaveBeenCalledWith("comp-uuid-1");
    });
  });

  describe("search", () => {
    it("should return search results", async () => {
      const result = await controller.search("getting");
      expect(result).toHaveLength(1);
      expect(typeof result[0].score).toBe("number");
      expect(service.search).toHaveBeenCalledWith("getting", undefined);
    });

    it("should pass componentId to search when provided", async () => {
      await controller.search("getting", "comp-uuid-1");
      expect(service.search).toHaveBeenCalledWith("getting", "comp-uuid-1");
    });
  });

  describe("update", () => {
    it("should update a documentation entry", async () => {
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
      const result = await controller.update(
        "doc-uuid-1",
        {
          title: "Updated Title",
        },
        mockReq,
      );
      expect(result).toEqual(mockDoc);
      expect(service.update).toHaveBeenCalledWith(
        "doc-uuid-1",
        {
          title: "Updated Title",
        },
        "org-uuid",
      );
    });
  });

  describe("remove", () => {
    it("should remove a documentation entry", async () => {
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
      await controller.remove("doc-uuid-1", mockReq);
      expect(service.remove).toHaveBeenCalledWith("doc-uuid-1", "org-uuid");
    });
  });

  describe("GET /docs/builds/:componentId", () => {
    it("returns build history for a component", async () => {
      const result = await controller.getBuilds("comp-uuid-1");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockBuild);
      expect(buildService.findByComponent).toHaveBeenCalledWith("comp-uuid-1");
    });
  });

  describe("GET /docs/:componentId/versions", () => {
    it("returns ready builds for the component", async () => {
      const result = await controller.getVersions("comp-uuid-1");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockBuild);
      expect(buildService.findVersions).toHaveBeenCalledWith("comp-uuid-1");
    });
  });
});
