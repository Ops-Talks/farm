import { Test, TestingModule } from "@nestjs/testing";
import { SloController } from "./slo.controller";
import { SloService } from "./slo.service";
import { SloCalculatorService } from "./slo-calculator.service";
import { Slo, SloMetricType, SloWindow } from "./entities/slo.entity";
import { CreateSloDto } from "./dto/create-slo.dto";
import { UpdateSloDto } from "./dto/update-slo.dto";
import {
  SloBudgetResponseDto,
  SloBudgetStatus,
} from "./dto/slo-budget-response.dto";
import { PaginatedResponseDto } from "../../common/dto";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";

const mockSloService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockCalculatorService = {
  calculateBudget: jest.fn(),
};

describe("SloController", () => {
  let controller: SloController;
  let sloService: typeof mockSloService;
  let calculatorService: typeof mockCalculatorService;

  const mockSlo: Slo = {
    id: "slo-uuid-1",
    name: "api-availability",
    description: "API availability SLO",
    targetPercent: 99.95,
    metricType: SloMetricType.AVAILABILITY,
    window: SloWindow.THIRTY_DAYS,
    componentId: "comp-uuid-1",
    organizationId: "org-uuid-1",
    enabled: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SloController],
      providers: [
        { provide: SloService, useValue: mockSloService },
        { provide: SloCalculatorService, useValue: mockCalculatorService },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SloController>(SloController);
    sloService = module.get(SloService);
    calculatorService = module.get(SloCalculatorService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should create an SLO", async () => {
    const dto: CreateSloDto = {
      name: "api-availability",
      targetPercent: 99.95,
      metricType: SloMetricType.AVAILABILITY,
      window: SloWindow.THIRTY_DAYS,
      organizationId: "org-uuid-1",
    };
    sloService.create.mockResolvedValue({ id: "slo-uuid-1", ...dto });
    const req = {
      user: { userId: "user-uuid-1" },
      organizationId: "org-uuid-1",
    };

    const result = await controller.create(req as never, dto);

    expect(result).toEqual({ id: "slo-uuid-1", ...dto });
    expect(sloService.create).toHaveBeenCalledWith(dto, "org-uuid-1");
  });

  it("should list SLOs with pagination", async () => {
    const items = [mockSlo];
    sloService.findAll.mockResolvedValue([items, 1]);

    const result = await controller.findAll({ skip: 0, take: 20 });

    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.data).toEqual(items);
    expect(result.total).toBe(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it("should default skip to 0 and take to 20 when query values are undefined", async () => {
    sloService.findAll.mockResolvedValue([[mockSlo], 1]);

    const result = await controller.findAll({
      skip: undefined,
      take: undefined,
    });

    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it("should get SLO by ID", async () => {
    sloService.findOne.mockResolvedValue(mockSlo);
    const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;

    const result = await controller.findOne("slo-uuid-1", mockReq);

    expect(result).toEqual(mockSlo);
    expect(sloService.findOne).toHaveBeenCalledWith("slo-uuid-1", "org-uuid");
  });

  it("should get SLO budget", async () => {
    const budgetResponse: SloBudgetResponseDto = {
      sloId: "slo-uuid-1",
      name: "api-availability",
      targetPercent: 99.95,
      currentPercent: 99.98,
      budgetTotal: 0.05,
      budgetConsumed: 0.02,
      budgetRemaining: 60.0,
      burnRate: 0.45,
      status: SloBudgetStatus.HEALTHY,
      windowStart: "2024-01-01T00:00:00.000Z",
      windowEnd: "2024-01-31T00:00:00.000Z",
    };
    calculatorService.calculateBudget.mockResolvedValue(budgetResponse);

    const result = await controller.getBudget("slo-uuid-1");

    expect(result).toEqual(budgetResponse);
    expect(calculatorService.calculateBudget).toHaveBeenCalledWith(
      "slo-uuid-1",
    );
  });

  it("should update an SLO", async () => {
    const updateDto: UpdateSloDto = { description: "Updated description" };
    sloService.update.mockResolvedValue({
      ...mockSlo,
      description: "Updated description",
    });
    const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;

    const result = await controller.update("slo-uuid-1", updateDto, mockReq);

    expect(result.description).toBe("Updated description");
    expect(sloService.update).toHaveBeenCalledWith(
      "slo-uuid-1",
      updateDto,
      "org-uuid",
    );
  });

  it("should delete an SLO", async () => {
    sloService.remove.mockResolvedValue(undefined);
    const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;

    const result = await controller.remove("slo-uuid-1", mockReq);

    expect(result).toBeUndefined();
    expect(sloService.remove).toHaveBeenCalledWith("slo-uuid-1", "org-uuid");
  });
});
