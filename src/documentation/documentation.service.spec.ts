import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import axios from "axios";
import { DocumentationService } from "./documentation.service";
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
        Promise.resolve({ id: "uuid", ...doc } as Documentation),
      ),
    find: jest.fn().mockResolvedValue([mockDoc]),
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
