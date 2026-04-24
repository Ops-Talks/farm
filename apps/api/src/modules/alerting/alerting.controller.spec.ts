import { Test, TestingModule } from "@nestjs/testing";
import { AlertingController } from "./alerting.controller";
import { AlertingService } from "./alerting.service";
import {
  AlertingRule,
  AlertingSeverity,
} from "./entities/alerting-rule.entity";
import { CreateAlertingRuleDto } from "./dto/create-alerting-rule.dto";
import { ListAlertingRulesQueryDto } from "./dto/list-alerting-rules-query.dto";
import { PaginatedResponseDto } from "../../common/dto";

describe("AlertingController", () => {
  let controller: AlertingController;

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

  const mockService = {
    create: jest.fn().mockResolvedValue(mockRule),
    findAll: jest.fn().mockResolvedValue([[mockRule], 1]),
    findOne: jest.fn().mockResolvedValue(mockRule),
    update: jest.fn().mockResolvedValue(mockRule),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertingController],
      providers: [{ provide: AlertingService, useValue: mockService }],
    }).compile();

    controller = module.get<AlertingController>(AlertingController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create and return an alerting rule", async () => {
      const dto: CreateAlertingRuleDto = {
        name: "high-error-rate",
        query: "sum(rate(http_requests_total[5m])) > 0.05",
        duration: "5m",
        severity: AlertingSeverity.WARNING,
      };
      mockService.create.mockResolvedValue(mockRule);

      const result = await controller.create(dto);

      expect(result).toEqual(mockRule);
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe("findAll", () => {
    it("should return a paginated response", async () => {
      mockService.findAll.mockResolvedValue([[mockRule], 1]);

      const query = new ListAlertingRulesQueryDto();
      const result = await controller.findAll(query);

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual([mockRule]);
      expect(result.total).toBe(1);
    });

    it("should use skip=0 and take=20 defaults when query properties are undefined", async () => {
      mockService.findAll.mockResolvedValue([[mockRule], 1]);

      const result = await controller.findAll({
        skip: undefined,
        take: undefined,
      });

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });
  });

  describe("findOne", () => {
    it("should return a single rule", async () => {
      mockService.findOne.mockResolvedValue(mockRule);

      const result = await controller.findOne("rule-uuid-1");

      expect(result).toEqual(mockRule);
      expect(mockService.findOne).toHaveBeenCalledWith("rule-uuid-1");
    });
  });

  describe("update", () => {
    it("should update and return the rule", async () => {
      const updated = { ...mockRule, duration: "10m" };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update("rule-uuid-1", {
        duration: "10m",
      });

      expect(result.duration).toBe("10m");
      expect(mockService.update).toHaveBeenCalledWith("rule-uuid-1", {
        duration: "10m",
      });
    });
  });

  describe("remove", () => {
    it("should call service remove", async () => {
      await controller.remove("rule-uuid-1");
      expect(mockService.remove).toHaveBeenCalledWith("rule-uuid-1");
    });
  });
});
