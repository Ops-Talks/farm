import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { EnvironmentsService } from "./environments.service";
import { Environment, EnvironmentType } from "./entities/environment.entity";

describe("EnvironmentsService", () => {
  let service: EnvironmentsService;
  let repository: Repository<Environment>;

  const mockEnvironment: Partial<Environment> = {
    id: "env-uuid-1",
    name: "production",
    description: "Production environment",
    type: EnvironmentType.PRODUCTION,
    order: 3,
    metadata: { region: "us-east-1" },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentsService,
        {
          provide: getRepositoryToken(Environment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            merge: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EnvironmentsService>(EnvironmentsService);
    repository = module.get<Repository<Environment>>(
      getRepositoryToken(Environment),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create an environment", async () => {
      jest.spyOn(repository, "findOne").mockResolvedValue(null);
      jest
        .spyOn(repository, "create")
        .mockReturnValue(mockEnvironment as Environment);
      jest
        .spyOn(repository, "save")
        .mockResolvedValue(mockEnvironment as Environment);

      const result = await service.create({
        name: "production",
        type: EnvironmentType.PRODUCTION,
      });

      expect(result).toEqual(mockEnvironment);
      expect(repository.create).toHaveBeenCalled();
    });

    it("should throw ConflictException if name exists", async () => {
      jest
        .spyOn(repository, "findOne")
        .mockResolvedValue(mockEnvironment as Environment);

      await expect(
        service.create({
          name: "production",
          type: EnvironmentType.PRODUCTION,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("findAll", () => {
    it("should return all environments ordered", async () => {
      jest
        .spyOn(repository, "find")
        .mockResolvedValue([mockEnvironment as Environment]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(repository.find).toHaveBeenCalledWith({
        order: { order: "ASC", name: "ASC" },
      });
    });
  });

  describe("findOne", () => {
    it("should return an environment by ID", async () => {
      jest
        .spyOn(repository, "findOne")
        .mockResolvedValue(mockEnvironment as Environment);

      const result = await service.findOne("env-uuid-1");

      expect(result).toEqual(mockEnvironment);
    });

    it("should throw NotFoundException if not found", async () => {
      jest.spyOn(repository, "findOne").mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update an environment", async () => {
      const updated = { ...mockEnvironment, description: "Updated" };
      jest
        .spyOn(repository, "findOne")
        .mockResolvedValue(mockEnvironment as Environment);
      jest.spyOn(repository, "merge").mockReturnValue(updated as Environment);
      jest.spyOn(repository, "save").mockResolvedValue(updated as Environment);

      const result = await service.update("env-uuid-1", {
        description: "Updated",
      });

      expect(result.description).toBe("Updated");
    });

    it("should throw ConflictException if renamed to existing name", async () => {
      const otherEnv = {
        ...mockEnvironment,
        id: "env-uuid-2",
        name: "staging",
      };
      jest
        .spyOn(repository, "findOne")
        .mockResolvedValueOnce(mockEnvironment as Environment)
        .mockResolvedValueOnce(otherEnv as Environment);

      await expect(
        service.update("env-uuid-1", { name: "staging" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("should remove an environment", async () => {
      jest
        .spyOn(repository, "findOne")
        .mockResolvedValue(mockEnvironment as Environment);
      jest
        .spyOn(repository, "remove")
        .mockResolvedValue(mockEnvironment as Environment);

      await service.remove("env-uuid-1");

      expect(repository.remove).toHaveBeenCalledWith(mockEnvironment);
    });
  });
});
