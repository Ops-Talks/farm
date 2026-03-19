import { Test, TestingModule } from "@nestjs/testing";
import { CloudCostService } from "./cloud-cost.service";
import { CloudResourceService } from "./cloud-resource.service";

const ORG_ID = "org-uuid-cost";

const mockCloudResourceService = {
  getAggregatedCost: jest.fn(),
};

describe("CloudCostService", () => {
  let service: CloudCostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudCostService,
        {
          provide: CloudResourceService,
          useValue: mockCloudResourceService,
        },
      ],
    }).compile();

    service = module.get<CloudCostService>(CloudCostService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // getAggregatedCost
  // ---------------------------------------------------------------------------
  describe("getAggregatedCost", () => {
    it("should delegate to CloudResourceService", async () => {
      const costData = [
        {
          provider: "aws",
          entries: [{ environment: "prod", cost: 100, currency: "USD" }],
        },
        {
          provider: "gcp",
          entries: [{ environment: "staging", cost: 50, currency: "USD" }],
        },
      ];
      mockCloudResourceService.getAggregatedCost.mockResolvedValue(costData);

      const result = await service.getAggregatedCost(ORG_ID, 30);

      expect(result).toEqual(costData);
      expect(mockCloudResourceService.getAggregatedCost).toHaveBeenCalledWith(
        ORG_ID,
        30,
      );
    });

    it("should use default 30 days when days is not specified", async () => {
      mockCloudResourceService.getAggregatedCost.mockResolvedValue([]);

      await service.getAggregatedCost(ORG_ID);

      expect(mockCloudResourceService.getAggregatedCost).toHaveBeenCalledWith(
        ORG_ID,
        30,
      );
    });

    it("should return empty array when CloudResourceService is not available", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [CloudCostService],
      }).compile();
      const svcNoResource = module.get<CloudCostService>(CloudCostService);

      const result = await svcNoResource.getAggregatedCost(ORG_ID, 30);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getFlatCostEntries
  // ---------------------------------------------------------------------------
  describe("getFlatCostEntries", () => {
    it("should flatten per-provider cost entries into a single array", async () => {
      mockCloudResourceService.getAggregatedCost.mockResolvedValue([
        {
          provider: "aws",
          entries: [
            { environment: "prod", cost: 100, currency: "USD" },
            { environment: "staging", cost: 50, currency: "USD" },
          ],
        },
        {
          provider: "gcp",
          entries: [{ environment: "prod", cost: 30, currency: "USD" }],
        },
      ]);

      const result = await service.getFlatCostEntries(ORG_ID, 30);

      expect(result).toHaveLength(3);
      expect(result[0].provider).toBe("aws");
      expect(result[2].provider).toBe("gcp");
    });

    it("should return empty array when no cost data", async () => {
      mockCloudResourceService.getAggregatedCost.mockResolvedValue([]);

      const result = await service.getFlatCostEntries(ORG_ID, 30);

      expect(result).toHaveLength(0);
    });
  });
});
