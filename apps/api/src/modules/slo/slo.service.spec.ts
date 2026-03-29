import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { SloService } from "./slo.service";
import { Slo, SloMetricType, SloWindow } from "./entities/slo.entity";
import { CreateSloDto } from "./dto/create-slo.dto";
import { ListSlosQueryDto } from "./dto/list-slos-query.dto";

describe("SloService", () => {
  let service: SloService;
  let repo: Record<string, jest.Mock>;

  const mockSlo: Slo = {
    id: "slo-uuid-1",
    name: "api-availability",
    description: "API gateway must maintain 99.95% availability",
    targetPercent: 99.95,
    metricType: SloMetricType.AVAILABILITY,
    window: SloWindow.THIRTY_DAYS,
    componentId: "comp-uuid-1",
    organizationId: "org-uuid-1",
    enabled: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const createDto: CreateSloDto = {
    name: "api-availability",
    description: "API gateway must maintain 99.95% availability",
    targetPercent: 99.95,
    metricType: SloMetricType.AVAILABILITY,
    window: SloWindow.THIRTY_DAYS,
    componentId: "comp-uuid-1",
    organizationId: "org-uuid-1",
    enabled: true,
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SloService,
        { provide: getRepositoryToken(Slo), useValue: repo },
      ],
    }).compile();

    service = module.get<SloService>(SloService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create an SLO successfully", async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockSlo);
      repo.save.mockResolvedValue(mockSlo);

      const result = await service.create(createDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name },
      });
      expect(repo.create).toHaveBeenCalledWith(createDto);
      expect(repo.save).toHaveBeenCalledWith(mockSlo);
      expect(result).toEqual(mockSlo);
    });

    it("should throw ConflictException when name already exists", async () => {
      repo.findOne.mockResolvedValue(mockSlo);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAll", () => {
    it("should findAll with no filters (returns paginated)", async () => {
      repo.findAndCount.mockResolvedValue([[mockSlo], 1]);

      const query = new ListSlosQueryDto();
      const result = await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual([[mockSlo], 1]);
    });

    it("should findAll with componentId filter", async () => {
      repo.findAndCount.mockResolvedValue([[mockSlo], 1]);

      const query = Object.assign(new ListSlosQueryDto(), {
        componentId: "comp-uuid-1",
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1" },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should findAll with metricType filter", async () => {
      repo.findAndCount.mockResolvedValue([[mockSlo], 1]);

      const query = Object.assign(new ListSlosQueryDto(), {
        metricType: SloMetricType.AVAILABILITY,
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { metricType: SloMetricType.AVAILABILITY },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should apply window, organizationId and enabled filters", async () => {
      repo.findAndCount.mockResolvedValue([[mockSlo], 1]);

      const query = Object.assign(new ListSlosQueryDto(), {
        window: SloWindow.NINETY_DAYS,
        organizationId: "org-uuid-1",
        enabled: true,
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {
          window: SloWindow.NINETY_DAYS,
          organizationId: "org-uuid-1",
          enabled: true,
        },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });
  });

  describe("findOne", () => {
    it("should findOne successfully", async () => {
      repo.findOne.mockResolvedValue(mockSlo);

      const result = await service.findOne("slo-uuid-1");

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "slo-uuid-1" },
      });
      expect(result).toEqual(mockSlo);
    });

    it("should throw NotFoundException when SLO not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update an SLO successfully", async () => {
      repo.findOne.mockResolvedValue(mockSlo);
      repo.merge.mockReturnValue({ ...mockSlo, description: "Updated desc" });
      repo.save.mockResolvedValue({ ...mockSlo, description: "Updated desc" });

      const result = await service.update("slo-uuid-1", {
        description: "Updated desc",
      });

      expect(result.description).toBe("Updated desc");
    });

    it("should skip name conflict check when the provided name equals the current name", async () => {
      repo.findOne.mockResolvedValue(mockSlo);
      repo.merge.mockReturnValue({ ...mockSlo });
      repo.save.mockResolvedValue(mockSlo);

      await service.update("slo-uuid-1", { name: mockSlo.name });

      // findOne is called once (for findOne inside update), NOT again for duplicate check.
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it("should update with a new name when no conflicting SLO exists", async () => {
      repo.findOne
        .mockResolvedValueOnce(mockSlo) // findOne for the SLO being updated
        .mockResolvedValueOnce(null); // findOne for conflict check -> no conflict
      repo.merge.mockReturnValue({ ...mockSlo, name: "new-slo-name" });
      repo.save.mockResolvedValue({ ...mockSlo, name: "new-slo-name" });

      const result = await service.update("slo-uuid-1", {
        name: "new-slo-name",
      });

      expect(result.name).toBe("new-slo-name");
    });

    it("should throw ConflictException on update when name conflicts", async () => {
      const otherSlo = { ...mockSlo, id: "slo-uuid-2", name: "other-slo" };
      repo.findOne
        .mockResolvedValueOnce(mockSlo)
        .mockResolvedValueOnce(otherSlo);

      await expect(
        service.update("slo-uuid-1", { name: "other-slo" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException if SLO to update does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { description: "nope" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove an SLO", async () => {
      repo.findOne.mockResolvedValue(mockSlo);
      repo.remove.mockResolvedValue(undefined);

      await expect(service.remove("slo-uuid-1")).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(mockSlo);
    });

    it("should throw NotFoundException if SLO to remove does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
