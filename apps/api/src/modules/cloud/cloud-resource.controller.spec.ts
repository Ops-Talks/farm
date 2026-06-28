import { Test, TestingModule } from "@nestjs/testing";
import { CloudResourceController } from "./cloud-resource.controller";
import { CloudResourceService } from "./cloud-resource.service";
import { CloudCostService } from "./cloud-cost.service";
import { CloudSecretsService } from "./cloud-secrets.service";
import { CloudResource } from "./interfaces/cloud-resource.interface";
import { DiscoverResourcesDto } from "./dto/discover-resources.dto";
import { CloudCostDto } from "./dto/cloud-cost.dto";
import { ResolveSecretDto } from "./dto/resolve-secret.dto";

const ORG_ID = "org-uuid-ctrl";

const mockResource: CloudResource = {
  provider: "aws",
  resourceId: "arn:aws:ecs:us-east-1:123:service/cluster/svc",
  resourceType: "ecs:service",
  name: "svc",
  region: "us-east-1",
  tags: { "farm:component": "my-comp" },
  linkedComponentId: "my-comp",
};

const mockCloudResourceService = {
  discoverAll: jest.fn(),
  discoverByProvider: jest.fn(),
  getAggregatedCost: jest.fn(),
  listConnectedProviders: jest.fn(),
  resolveSecret: jest.fn(),
};

const mockCloudCostService = {
  getAggregatedCost: jest.fn(),
};

const mockCloudSecretsService = {
  resolve: jest.fn(),
};

describe("CloudResourceController", () => {
  let controller: CloudResourceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CloudResourceController],
      providers: [
        { provide: CloudResourceService, useValue: mockCloudResourceService },
        { provide: CloudCostService, useValue: mockCloudCostService },
        { provide: CloudSecretsService, useValue: mockCloudSecretsService },
      ],
    })
      .compile();

    controller = module.get<CloudResourceController>(CloudResourceController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // discoverResources
  // ---------------------------------------------------------------------------
  describe("discoverResources", () => {
    it("should return all resources when no provider is specified", async () => {
      mockCloudResourceService.discoverAll.mockResolvedValue([mockResource]);
      const query: DiscoverResourcesDto = { orgId: ORG_ID };

      const result = await controller.discoverResources(query);

      expect(result).toEqual([mockResource]);
      expect(mockCloudResourceService.discoverAll).toHaveBeenCalledWith(ORG_ID);
    });

    it("should filter by provider when provider is specified", async () => {
      mockCloudResourceService.discoverByProvider.mockResolvedValue([
        mockResource,
      ]);
      const query: DiscoverResourcesDto = { orgId: ORG_ID, provider: "aws" };

      const result = await controller.discoverResources(query);

      expect(result).toEqual([mockResource]);
      expect(mockCloudResourceService.discoverByProvider).toHaveBeenCalledWith(
        ORG_ID,
        "aws",
      );
    });

    it("should return empty array when service is not available", async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [CloudResourceController],
      })
        .compile();
      const ctrl = module.get<CloudResourceController>(CloudResourceController);

      const result = await ctrl.discoverResources({ orgId: ORG_ID });

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getCost
  // ---------------------------------------------------------------------------
  describe("getCost", () => {
    it("should return aggregated cost data", async () => {
      const costData = [
        {
          provider: "aws",
          entries: [{ environment: "prod", cost: 100, currency: "USD" }],
        },
      ];
      mockCloudCostService.getAggregatedCost.mockResolvedValue(costData);
      const query: CloudCostDto = { orgId: ORG_ID, days: 30 };

      const result = await controller.getCost(query);

      expect(result).toEqual(costData);
      expect(mockCloudCostService.getAggregatedCost).toHaveBeenCalledWith(
        ORG_ID,
        30,
      );
    });

    it("should default to 30 days when days is not specified", async () => {
      mockCloudCostService.getAggregatedCost.mockResolvedValue([]);
      const query: CloudCostDto = { orgId: ORG_ID };

      await controller.getCost(query);

      expect(mockCloudCostService.getAggregatedCost).toHaveBeenCalledWith(
        ORG_ID,
        30,
      );
    });

    it("should return empty array when cost service is not available", async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [CloudResourceController],
      })
        .compile();
      const ctrl = module.get<CloudResourceController>(CloudResourceController);

      const result = await ctrl.getCost({ orgId: ORG_ID });

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // resolveSecret
  // ---------------------------------------------------------------------------
  describe("resolveSecret", () => {
    it("should resolve and return the secret value", async () => {
      mockCloudSecretsService.resolve.mockResolvedValue("resolved-secret");
      const dto: ResolveSecretDto = {
        ref: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
        orgId: ORG_ID,
      };

      const result = await controller.resolveSecret(dto);

      expect(result).toEqual({ value: "resolved-secret" });
      expect(mockCloudSecretsService.resolve).toHaveBeenCalledWith(
        dto.ref,
        ORG_ID,
      );
    });

    it("should throw when secrets service is not available", async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [CloudResourceController],
      })
        .compile();
      const ctrl = module.get<CloudResourceController>(CloudResourceController);

      await expect(
        ctrl.resolveSecret({
          ref: "arn:aws:secretsmanager:us-east-1:123:secret:s",
          orgId: ORG_ID,
        }),
      ).rejects.toThrow("not available");
    });
  });

  // ---------------------------------------------------------------------------
  // listConnectedProviders
  // ---------------------------------------------------------------------------
  describe("listConnectedProviders", () => {
    it("should return list of connected providers", async () => {
      mockCloudResourceService.listConnectedProviders.mockResolvedValue([
        "aws",
        "gcp",
      ]);

      const result = await controller.listConnectedProviders(ORG_ID);

      expect(result).toEqual({ providers: ["aws", "gcp"] });
      expect(
        mockCloudResourceService.listConnectedProviders,
      ).toHaveBeenCalledWith(ORG_ID);
    });

    it("should return empty providers when service is not available", async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [CloudResourceController],
      })
        .compile();
      const ctrl = module.get<CloudResourceController>(CloudResourceController);

      const result = await ctrl.listConnectedProviders(ORG_ID);

      expect(result).toEqual({ providers: [] });
    });
  });
});
