import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { AlertingService } from "./alerting.service";
import {
  AlertingRule,
  AlertingSeverity,
} from "./entities/alerting-rule.entity";
import { CreateAlertingRuleDto } from "./dto/create-alerting-rule.dto";
import { ListAlertingRulesQueryDto } from "./dto/list-alerting-rules-query.dto";

describe("AlertingService", () => {
  let service: AlertingService;
  let repo: Record<string, jest.Mock>;

  const mockRule: AlertingRule = {
    id: "rule-uuid-1",
    name: "high-error-rate",
    description: "Fires when error rate is high",
    query: "sum(rate(http_requests_total[5m])) > 0.05",
    duration: "5m",
    severity: AlertingSeverity.WARNING,
    componentId: "comp-uuid-1",
    environmentId: "env-uuid-1",
    labels: { team: "platform" },
    annotations: { summary: "High error rate" },
    enabled: true,
    organizationId: "org-uuid-1",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const createDto: CreateAlertingRuleDto = {
    name: "high-error-rate",
    description: "Fires when error rate is high",
    query: "sum(rate(http_requests_total[5m])) > 0.05",
    duration: "5m",
    severity: AlertingSeverity.WARNING,
    componentId: "comp-uuid-1",
    environmentId: "env-uuid-1",
    labels: { team: "platform" },
    annotations: { summary: "High error rate" },
    enabled: true,
    organizationId: "org-uuid-1",
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
        AlertingService,
        { provide: getRepositoryToken(AlertingRule), useValue: repo },
      ],
    }).compile();

    service = module.get<AlertingService>(AlertingService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create and return an alerting rule", async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockRule);
      repo.save.mockResolvedValue(mockRule);

      const result = await service.create(createDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name },
      });
      expect(repo.create).toHaveBeenCalledWith(createDto);
      expect(repo.save).toHaveBeenCalledWith(mockRule);
      expect(result).toEqual(mockRule);
    });

    it("should throw ConflictException if name already exists", async () => {
      repo.findOne.mockResolvedValue(mockRule);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated rules with no filters", async () => {
      repo.findAndCount.mockResolvedValue([[mockRule], 1]);

      const query = new ListAlertingRulesQueryDto();
      const result = await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual([[mockRule], 1]);
    });

    it("should apply componentId and severity filters", async () => {
      repo.findAndCount.mockResolvedValue([[mockRule], 1]);

      const query = Object.assign(new ListAlertingRulesQueryDto(), {
        componentId: "comp-uuid-1",
        severity: AlertingSeverity.WARNING,
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {
          componentId: "comp-uuid-1",
          severity: AlertingSeverity.WARNING,
        },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 20,
      });
    });

    it("should apply environmentId, organizationId and enabled filters", async () => {
      repo.findAndCount.mockResolvedValue([[mockRule], 1]);

      const query = Object.assign(new ListAlertingRulesQueryDto(), {
        environmentId: "env-uuid-1",
        organizationId: "org-uuid-1",
        enabled: true,
      });
      await service.findAll(query);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {
          environmentId: "env-uuid-1",
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
    it("should return a rule by id", async () => {
      repo.findOne.mockResolvedValue(mockRule);

      const result = await service.findOne("rule-uuid-1");

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: "rule-uuid-1" },
      });
      expect(result).toEqual(mockRule);
    });

    it("should throw NotFoundException if rule not found", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update and return the rule", async () => {
      repo.findOne.mockResolvedValue(mockRule);
      repo.merge.mockReturnValue({ ...mockRule, duration: "10m" });
      repo.save.mockResolvedValue({ ...mockRule, duration: "10m" });

      const result = await service.update("rule-uuid-1", { duration: "10m" });

      expect(result.duration).toBe("10m");
    });

    it("should skip name conflict check when the provided name equals the current name", async () => {
      repo.findOne.mockResolvedValue(mockRule);
      repo.merge.mockReturnValue({ ...mockRule });
      repo.save.mockResolvedValue(mockRule);

      // Providing the same name should not trigger a conflict lookup.
      await service.update("rule-uuid-1", { name: mockRule.name });

      // findOne is called once (for findOne inside update), NOT again for duplicate check.
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });

    it("should update with a new name when no conflicting rule exists", async () => {
      repo.findOne
        .mockResolvedValueOnce(mockRule) // findOne for the rule being updated
        .mockResolvedValueOnce(null); // findOne for conflict check → no conflict
      repo.merge.mockReturnValue({ ...mockRule, name: "new-rule-name" });
      repo.save.mockResolvedValue({ ...mockRule, name: "new-rule-name" });

      const result = await service.update("rule-uuid-1", {
        name: "new-rule-name",
      });

      expect(result.name).toBe("new-rule-name");
    });

    it("should throw ConflictException if new name already exists on another rule", async () => {
      const otherRule = { ...mockRule, id: "rule-uuid-2", name: "other-rule" };
      repo.findOne
        .mockResolvedValueOnce(mockRule)
        .mockResolvedValueOnce(otherRule);

      await expect(
        service.update("rule-uuid-1", { name: "other-rule" }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException if rule to update does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { duration: "10m" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove a rule", async () => {
      repo.findOne.mockResolvedValue(mockRule);
      repo.remove.mockResolvedValue(undefined);

      await expect(service.remove("rule-uuid-1")).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(mockRule);
    });

    it("should throw NotFoundException if rule to remove does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
