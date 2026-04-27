import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { QueryFailedError } from "typeorm";
import { ComponentElasticsearchIndexService } from "./component-elasticsearch-index.service";
import { ComponentElasticsearchIndex } from "./entities/component-elasticsearch-index.entity";

describe("ComponentElasticsearchIndexService", () => {
  let service: ComponentElasticsearchIndexService;
  let repo: Record<string, jest.Mock>;

  const componentId = "11111111-1111-1111-1111-111111111111";
  const indexId = "22222222-2222-2222-2222-222222222222";

  const mockEntity: ComponentElasticsearchIndex = {
    id: indexId,
    componentId,
    indexPattern: "logs-app-*",
    esUrl: null,
    description: null,
    organizationId: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([mockEntity]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data: unknown) => data),
      save: jest.fn().mockResolvedValue(mockEntity),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComponentElasticsearchIndexService,
        {
          provide: getRepositoryToken(ComponentElasticsearchIndex),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get(ComponentElasticsearchIndexService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("findByComponent", () => {
    it("returns linked entries ordered by indexPattern", async () => {
      const result = await service.findByComponent(componentId);
      expect(repo.find).toHaveBeenCalledWith({
        where: { componentId },
        order: { indexPattern: "ASC" },
      });
      expect(result).toEqual([mockEntity]);
    });
  });

  describe("create", () => {
    it("persists a new link when no duplicate exists", async () => {
      const result = await service.create(componentId, {
        indexPattern: "logs-app-*",
      });
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { componentId, indexPattern: "logs-app-*" },
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(mockEntity);
    });

    // FARM-ST410: duplicate (componentId, indexPattern) returns 409 Conflict
    it("throws ConflictException when an identical link already exists", async () => {
      repo.findOne.mockResolvedValueOnce(mockEntity);
      await expect(
        service.create(componentId, { indexPattern: "logs-app-*" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("translates a unique-constraint QueryFailedError into ConflictException", async () => {
      repo.findOne.mockResolvedValueOnce(null);
      repo.save.mockRejectedValueOnce(
        new QueryFailedError(
          "INSERT",
          [],
          new Error("UNIQUE constraint failed"),
        ),
      );
      await expect(
        service.create(componentId, { indexPattern: "logs-app-*" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("remove", () => {
    it("removes an existing link", async () => {
      repo.findOne.mockResolvedValueOnce(mockEntity);
      await service.remove(componentId, indexId);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: indexId, componentId },
      });
      expect(repo.remove).toHaveBeenCalledWith(mockEntity);
    });

    // FARM-ST411: delete with non-existent id returns 404 Not Found
    it("throws NotFoundException when the id does not exist for the component", async () => {
      repo.findOne.mockResolvedValueOnce(null);
      await expect(service.remove(componentId, indexId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
