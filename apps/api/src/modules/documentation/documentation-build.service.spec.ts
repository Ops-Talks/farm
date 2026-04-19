import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DocumentationBuildService } from "./documentation-build.service";
import { DocumentationBuild } from "./entities/documentation-build.entity";

describe("DocumentationBuildService", () => {
  let service: DocumentationBuildService;

  const makeBuild = (
    overrides: Partial<DocumentationBuild> = {},
  ): DocumentationBuild =>
    ({
      id: "build-uuid-1",
      componentId: "comp-uuid-1",
      version: "1.0.0",
      sourceType: "markdown",
      status: "building",
      buildLog: null,
      artifactsPath: null,
      triggeredAt: new Date("2024-01-01T00:00:00Z"),
      completedAt: null,
      ...overrides,
    }) as DocumentationBuild;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentationBuildService,
        {
          provide: getRepositoryToken(DocumentationBuild),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentationBuildService>(DocumentationBuildService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create()", () => {
    it("saves a new build record with status building", async () => {
      const build = makeBuild();
      mockRepository.create.mockReturnValue(build);
      mockRepository.save.mockResolvedValue(build);

      const result = await service.create("comp-uuid-1", "1.0.0", "markdown");

      expect(mockRepository.create).toHaveBeenCalledWith({
        componentId: "comp-uuid-1",
        version: "1.0.0",
        sourceType: "markdown",
        status: "building",
        buildLog: null,
        artifactsPath: null,
        completedAt: null,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(build);
      expect(result.status).toBe("building");
    });
  });

  describe("updateStatus()", () => {
    it("merges extras and saves the updated build", async () => {
      const completedAt = new Date("2024-01-01T00:01:00Z");
      const updated = makeBuild({
        status: "ready",
        buildLog: "Build succeeded",
        artifactsPath: "/artifacts/comp-uuid-1/1.0.0",
        completedAt,
      });
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOneBy.mockResolvedValue(updated);

      const result = await service.updateStatus("build-uuid-1", "ready", {
        buildLog: "Build succeeded",
        artifactsPath: "/artifacts/comp-uuid-1/1.0.0",
        completedAt,
      });

      expect(mockRepository.update).toHaveBeenCalledWith("build-uuid-1", {
        status: "ready",
        buildLog: "Build succeeded",
        artifactsPath: "/artifacts/comp-uuid-1/1.0.0",
        completedAt,
      });
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({
        id: "build-uuid-1",
      });
      expect(result.status).toBe("ready");
      expect(result.buildLog).toBe("Build succeeded");
    });
  });

  describe("findByComponent()", () => {
    it("returns builds ordered by triggeredAt DESC", async () => {
      const builds = [
        makeBuild({
          id: "build-uuid-2",
          triggeredAt: new Date("2024-01-02T00:00:00Z"),
        }),
        makeBuild({
          id: "build-uuid-1",
          triggeredAt: new Date("2024-01-01T00:00:00Z"),
        }),
      ];
      mockRepository.find.mockResolvedValue(builds);

      const result = await service.findByComponent("comp-uuid-1");

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1" },
        order: { triggeredAt: "DESC" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("build-uuid-2");
    });
  });

  describe("findVersions()", () => {
    it("returns only ready builds sorted by triggeredAt DESC", async () => {
      const builds = [
        makeBuild({
          id: "build-uuid-3",
          status: "ready",
          triggeredAt: new Date("2024-03-01T00:00:00Z"),
        }),
        makeBuild({
          id: "build-uuid-2",
          status: "ready",
          triggeredAt: new Date("2024-02-01T00:00:00Z"),
        }),
      ];
      mockRepository.find.mockResolvedValue(builds);

      const result = await service.findVersions("comp-uuid-1");

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1", status: "ready" },
        order: { triggeredAt: "DESC" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("build-uuid-3");
      expect(result[1].id).toBe("build-uuid-2");
    });

    it("returns empty array when no ready builds exist", async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findVersions("comp-uuid-1");

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1", status: "ready" },
        order: { triggeredAt: "DESC" },
      });
      expect(result).toEqual([]);
    });
  });

  describe("findLatestReady()", () => {
    it("returns null when no ready build exists", async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findLatestReady("comp-uuid-1");

      expect(result).toBeNull();
    });

    it("returns the latest ready build when one exists", async () => {
      const readyBuild = makeBuild({ status: "ready" });
      mockRepository.find.mockResolvedValue([readyBuild]);

      const result = await service.findLatestReady("comp-uuid-1");

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1", status: "ready" },
        order: { triggeredAt: "DESC" },
        take: 1,
      });
      expect(result).toEqual(readyBuild);
      expect(result?.status).toBe("ready");
    });
  });
});
