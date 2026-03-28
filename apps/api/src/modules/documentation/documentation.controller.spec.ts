import { Test, TestingModule } from "@nestjs/testing";
import { DocumentationController } from "./documentation.controller";
import { DocumentationService } from "./documentation.service";
import { PaginatedResponseDto } from "../../common/dto";

describe("DocumentationController", () => {
  let controller: DocumentationController;
  let service: DocumentationService;

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
      ],
    }).compile();

    controller = module.get<DocumentationController>(DocumentationController);
    service = module.get<DocumentationService>(DocumentationService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a documentation entry", async () => {
      const result = await controller.create({
        title: "Getting Started",
        sourceUrl: "https://raw.githubusercontent.com/org/repo/main/README.md",
        componentId: "comp-uuid-1",
        author: "john_doe",
        version: "1.0.0",
      });
      expect(result).toEqual(mockDoc);
      expect(service.create).toHaveBeenCalled();
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
        } as never,
        {},
      );
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });
  });

  describe("findOne", () => {
    it("should return one documentation entry by ID", async () => {
      const result = await controller.findOne("doc-uuid-1");
      expect(result).toEqual(mockDoc);
      expect(service.findOne).toHaveBeenCalledWith("doc-uuid-1");
    });
  });

  describe("getContent", () => {
    it("should return markdown content", async () => {
      const result = await controller.getContent("doc-uuid-1");
      expect(result).toBe("# Hello World");
      expect(service.getContent).toHaveBeenCalledWith("doc-uuid-1");
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
      const result = await controller.update("doc-uuid-1", {
        title: "Updated Title",
      });
      expect(result).toEqual(mockDoc);
      expect(service.update).toHaveBeenCalledWith("doc-uuid-1", {
        title: "Updated Title",
      });
    });
  });

  describe("remove", () => {
    it("should remove a documentation entry", async () => {
      await controller.remove("doc-uuid-1");
      expect(service.remove).toHaveBeenCalledWith("doc-uuid-1");
    });
  });
});
