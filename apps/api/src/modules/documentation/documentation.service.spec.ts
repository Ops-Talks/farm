import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import axios from "axios";
import { DocumentationService, sanitizeHtml } from "./documentation.service";
import { Documentation } from "./entities/documentation.entity";
import { CreateDocumentationDto } from "./dto/create-documentation.dto";

jest.mock("axios");

describe("DocumentationService", () => {
  let service: DocumentationService;

  const mockDoc: Documentation = {
    id: "uuid",
    title: "Doc",
    sourceUrl: "http://example.com/doc.md",
    componentId: "comp-uuid",
    author: "author",
    version: "1.0.0",
    parentId: null,
    order: 0,
    organizationId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest
      .fn()
      .mockImplementation(
        (dto: CreateDocumentationDto) => dto as Documentation,
      ),
    save: jest
      .fn()
      .mockImplementation((doc: Documentation) =>
        Promise.resolve({ ...doc, id: doc.id ?? "uuid" } as Documentation),
      ),
    find: jest.fn().mockResolvedValue([mockDoc]),
    findAndCount: jest.fn().mockResolvedValue([[mockDoc], 1]),
    findOneBy: jest.fn().mockResolvedValue(mockDoc),
    merge: jest.fn().mockImplementation(
      (entity: Documentation, dto: any) =>
        ({
          ...entity,
          ...dto,
        }) as Documentation,
    ),
    remove: jest.fn().mockResolvedValue(mockDoc),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentationService,
        {
          provide: getRepositoryToken(Documentation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentationService>(DocumentationService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create documentation", async () => {
      const dto: CreateDocumentationDto = {
        title: "New Doc",
        sourceUrl: "http://example.com/new.md",
        componentId: "id",
        author: "author",
        version: "1.0.0",
      };
      const result = await service.create(dto);
      expect(result.title).toBe(dto.title);
    });
  });

  describe("findAll", () => {
    it("should return all documentation entries", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockDoc], 1]);
      const [data, total] = await service.findAll();
      expect(data).toEqual([mockDoc]);
      expect(total).toBe(1);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
      });
    });

    it("should filter by componentId when provided", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockDoc], 1]);
      const [data, total] = await service.findAll(0, 20, "comp-uuid");
      expect(data).toEqual([mockDoc]);
      expect(total).toBe(1);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid" },
        skip: 0,
        take: 20,
      });
    });

    it("should filter by organizationId when provided", async () => {
      const orgDoc = { ...mockDoc, organizationId: "org-uuid-1" };
      mockRepository.findAndCount.mockResolvedValue([[orgDoc], 1]);

      const [data, total] = await service.findAll(
        0,
        20,
        undefined,
        "org-uuid-1",
      );

      expect(data).toEqual([orgDoc]);
      expect(total).toBe(1);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: "org-uuid-1" },
        skip: 0,
        take: 20,
      });
    });

    it("should filter by both componentId and organizationId when both are provided", async () => {
      const orgDoc = { ...mockDoc, organizationId: "org-uuid-1" };
      mockRepository.findAndCount.mockResolvedValue([[orgDoc], 1]);

      const [data, total] = await service.findAll(
        0,
        20,
        "comp-uuid",
        "org-uuid-1",
      );

      expect(data).toEqual([orgDoc]);
      expect(total).toBe(1);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid", organizationId: "org-uuid-1" },
        skip: 0,
        take: 20,
      });
    });

    it("should return all entries without organization filter when organizationId is not provided", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockDoc], 1]);

      const [data] = await service.findAll(0, 20);

      expect(data).toEqual([mockDoc]);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe("getContent", () => {
    it("should fetch and return content from sourceUrl", async () => {
      const markdownContent = "# Hello World";
      (axios.get as jest.Mock).mockResolvedValue({ data: markdownContent });

      const result = await service.getContent("uuid");

      expect(axios.get).toHaveBeenCalledWith(mockDoc.sourceUrl);
      expect(result).toBe(markdownContent);
    });

    it("should throw NotFoundException if fetching fails", async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error("Network error"));
      await expect(service.getContent("uuid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("renderContent", () => {
    it("should render markdown to sanitized HTML", async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: "# Hello" });

      const result = await service.renderContent("uuid");

      expect(result).toContain("<h1>");
      expect(result).toContain("Hello");
    });

    it("should strip script tags from rendered output", async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: "Hello <script>alert('xss')</script>",
      });

      const result = await service.renderContent("uuid");

      expect(result).not.toContain("<script>");
    });
  });

  describe("buildTree", () => {
    it("should build a navigation tree from flat docs", async () => {
      const parent: Documentation = {
        ...mockDoc,
        id: "parent-id",
        title: "Parent",
        parentId: null,
        order: 0,
      };
      const child: Documentation = {
        ...mockDoc,
        id: "child-id",
        title: "Child",
        parentId: "parent-id",
        order: 1,
      };
      mockRepository.find.mockResolvedValue([parent, child]);

      const tree = await service.buildTree("comp-uuid");

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe("parent-id");
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe("child-id");
    });

    it("should return empty array when no docs exist", async () => {
      mockRepository.find.mockResolvedValue([]);

      const tree = await service.buildTree("comp-uuid");

      expect(tree).toHaveLength(0);
    });
  });

  describe("search", () => {
    it("should find docs matching the query by title", async () => {
      mockRepository.find.mockResolvedValue([
        { ...mockDoc, id: "1", title: "API Guide" },
        { ...mockDoc, id: "2", title: "Setup Instructions" },
      ]);

      const results = await service.search("api");

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("API Guide");
    });

    it("should give higher score to exact matches", async () => {
      mockRepository.find.mockResolvedValue([
        { ...mockDoc, id: "1", title: "api" },
        { ...mockDoc, id: "2", title: "API Reference Guide" },
      ]);

      const results = await service.search("api");

      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(1.0);
      expect(results[1].score).toBe(0.5);
    });

    it("should return empty array when nothing matches", async () => {
      mockRepository.find.mockResolvedValue([
        { ...mockDoc, id: "1", title: "Setup" },
      ]);

      const results = await service.search("nonexistent");

      expect(results).toHaveLength(0);
    });

    it("should scope the search to a specific component when componentId is provided", async () => {
      mockRepository.find.mockResolvedValue([
        { ...mockDoc, id: "1", title: "API Guide" },
      ]);

      await service.search("api", "comp-uuid");

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { componentId: "comp-uuid" } }),
      );
    });
  });

  describe("findOne — NotFoundException", () => {
    it("should throw NotFoundException when documentation is not found", async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

describe("sanitizeHtml", () => {
  it("should remove script tags", () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    expect(sanitizeHtml(html)).not.toContain("<script>");
  });

  it("should remove iframe tags", () => {
    const html = '<iframe src="http://evil.com"></iframe>';
    expect(sanitizeHtml(html)).not.toContain("<iframe>");
  });

  it("should remove event handlers", () => {
    const html = '<img src="x" onerror="alert(1)">';
    expect(sanitizeHtml(html)).not.toContain("onerror");
  });

  it("should neutralize javascript: hrefs", () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("javascript:");
  });

  it("should preserve safe HTML", () => {
    const html = "<h1>Hello</h1><p>World</p>";
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("should remove nested block tags that become dangerous after a first pass", () => {
    // Removing the inner <script>...</script> leaves an outer <script>...</script>
    // which requires a second iteration to remove.
    const html = "<sc<script>ript>alert(1)</sc</script>ript>";
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert(1)");
  });

  it("should remove self-closing tags that become dangerous after a first pass", () => {
    // Removing the inner <script> (self-closing) leaves an outer <script>
    // which requires a second iteration to remove.
    const html = "<sc<script>ript>";
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script");
  });

  it("should remove nested iframe tags across multiple iterations", () => {
    const html =
      "<ifr<iframe src='evil.com'>ame src='evil.com'></ifr</iframe>ame>";
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<iframe");
  });

  it("should terminate and return a sanitized result even with deeply repeated nesting", () => {
    // Build input that requires several passes but stays within the iteration limit.
    let html = "attack";
    for (let i = 0; i < 5; i++) {
      html = `<sc<script>ript>${html}</sc</script>ript>`;
    }
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script");
    expect(typeof result).toBe("string");
  });
});
