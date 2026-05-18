import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { getQueueToken } from "@nestjs/bullmq";
import { NotFoundException } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { FinOpsService } from "../finops/finops.service";
import { CreateComponentDto } from "./dto/create-component.dto";
import { UpdateComponentDto } from "./dto/update-component.dto";
import { ComponentKind } from "./entities/component.entity";
import { PaginatedResponseDto } from "../../common/dto";
import { CATALOG_DISCOVERY_QUEUE } from "./processors/catalog-discovery.processor";

const mockCatalogService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  setContainerImage: jest.fn(),
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  clear: jest.fn(),
};

const mockDiscoveryQueue = {
  add: jest.fn(),
};

describe("CatalogController", () => {
  let controller: CatalogController;
  let service: typeof mockCatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        {
          provide: getQueueToken(CATALOG_DISCOVERY_QUEUE),
          useValue: mockDiscoveryQueue,
        },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CatalogController>(CatalogController);
    service = module.get(CatalogService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should create a component", async () => {
    const dto: CreateComponentDto = {
      name: "Test",
      kind: ComponentKind.SERVICE,
      owner: "test-team",
    };
    service.create.mockResolvedValue({ id: "1", ...dto });
    expect(
      await controller.create(dto, { organizationId: "org-uuid-1" }),
    ).toEqual({ id: "1", ...dto });
    expect(service.create).toHaveBeenCalledWith(dto, "org-uuid-1");
  });

  it("should return all components with pagination", async () => {
    const items = [{ id: "1", name: "Test", type: "service" }];
    service.findAll.mockResolvedValue([items, 1]);
    const mockReq = { organizationId: undefined };
    const result = await controller.findAll(
      { skip: 0, take: 20 },
      undefined,
      mockReq,
    );
    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.data).toEqual(items);
    expect(result.total).toBe(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it("should return one component", async () => {
    const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
    service.findOne.mockResolvedValue({
      id: "1",
      name: "Test",
      type: "service",
    });
    expect(await controller.findOne("1", mockReq)).toEqual({
      id: "1",
      name: "Test",
      type: "service",
    });
  });

  it("should update a component", async () => {
    const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
    service.update.mockResolvedValue({
      id: "1",
      name: "Updated",
      type: "service",
    });
    const updateDto: UpdateComponentDto = { name: "Updated" };
    expect(await controller.update("1", updateDto, mockReq)).toEqual({
      id: "1",
      name: "Updated",
      type: "service",
    });
  });

  it("should remove a component (no content)", async () => {
    const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
    service.remove.mockResolvedValue({ deleted: true });
    expect(await controller.remove("1", mockReq)).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Branch coverage: `query.skip ?? 0` and `query.take ?? 20` null-coalescing
  // operators — only reachable when skip / take are undefined at runtime.
  // ---------------------------------------------------------------------------

  it("should default skip to 0 and take to 20 when query values are undefined", async () => {
    const items = [{ id: "1", name: "Test", type: "service" }];
    service.findAll.mockResolvedValue([items, 1]);
    const mockReq = { organizationId: undefined };

    const result = await controller.findAll(
      { skip: undefined, take: undefined },
      undefined,
      mockReq,
    );

    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it("should enqueue a discovery job", async () => {
    mockDiscoveryQueue.add.mockResolvedValue({ id: "job-123" });
    const result = await controller.discoverFromLocation({
      url: "https://github.com/example/repo",
    });
    expect(result.jobId).toBe("job-123");
    expect(result.message).toContain("https://github.com/example/repo");
    expect(mockDiscoveryQueue.add).toHaveBeenCalledWith("discover", {
      url: "https://github.com/example/repo",
    });
  });

  describe("setContainerImage()", () => {
    it("should delegate to catalogService.setContainerImage", async () => {
      const updated = { id: "comp-1", containerImage: "nginx:1.25" };
      mockCatalogService.setContainerImage.mockResolvedValue(updated);

      const result = await controller.setContainerImage("comp-1", {
        containerImage: "nginx:1.25",
      });

      expect(result).toEqual(updated);
      expect(mockCatalogService.setContainerImage).toHaveBeenCalledWith(
        "comp-1",
        { containerImage: "nginx:1.25" },
      );
    });
  });

  describe("getCostEstimate() — finOpsService not provided", () => {
    it("throws NotFoundException when finOpsService is not available", async () => {
      await expect(controller.getCostEstimate("comp-1")).rejects.toThrow(
        new NotFoundException("Cost estimate not available"),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// CatalogController — without discovery queue (synchronous fallback)
// ---------------------------------------------------------------------------

describe("CatalogController — without discovery queue", () => {
  let controller: CatalogController;
  const mockCatalogServiceLocal = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    discoverFromLocation: jest.fn(),
    registerYaml: jest.fn(),
  };
  const mockCacheManagerLocal = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        { provide: CatalogService, useValue: mockCatalogServiceLocal },
        { provide: CACHE_MANAGER, useValue: mockCacheManagerLocal },
        // No discovery queue — fallback to synchronous discovery
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CatalogController>(CatalogController);
    jest.clearAllMocks();
  });

  describe("discoverFromLocation — synchronous fallback", () => {
    it("should call discoverFromLocation directly when no queue is available", async () => {
      mockCatalogServiceLocal.discoverFromLocation.mockResolvedValue(3);

      const result = await controller.discoverFromLocation({
        url: "https://github.com/example/fallback-repo",
      });

      expect(result.discovered).toBe(3);
      expect(result.message).toContain(
        "https://github.com/example/fallback-repo",
      );
      expect(result.jobId).toBeUndefined();
    });
  });

  describe("registerYaml", () => {
    it("should register a component from YAML and clear cache", async () => {
      const mockComponent = {
        id: "comp-yaml",
        name: "yaml-svc",
        kind: "service",
      };
      mockCatalogServiceLocal.registerYaml.mockResolvedValue(mockComponent);

      const result = await controller.registerYaml(
        {
          yaml: "apiVersion: farm.io/v1\nkind: Component\nmetadata:\n  name: yaml-svc\nspec:\n  type: service\n  owner: team-a",
        },
        { organizationId: "org-uuid-1" },
      );

      expect(result).toEqual(mockComponent);
      expect(mockCatalogServiceLocal.registerYaml).toHaveBeenCalledWith(
        expect.any(String),
        "org-uuid-1",
      );
      expect(mockCacheManagerLocal.clear).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// CatalogController — getCostEstimate with FinOpsService
// ---------------------------------------------------------------------------

describe("CatalogController — getCostEstimate with FinOpsService", () => {
  let controller: CatalogController;

  const mockFinOpsService = {
    getCostEstimate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            setContainerImage: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            clear: jest.fn(),
          },
        },
        { provide: FinOpsService, useValue: mockFinOpsService },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CatalogController>(CatalogController);
  });

  it("throws NotFoundException when estimate does not exist", async () => {
    mockFinOpsService.getCostEstimate.mockResolvedValue(null);

    await expect(controller.getCostEstimate("comp-1")).rejects.toThrow(
      new NotFoundException("No cost estimate found for component comp-1"),
    );
  });

  it("returns mapped DTO when estimate exists", async () => {
    const estimate = {
      id: "est-1",
      componentId: "comp-1",
      pipelineRunId: "run-1",
      estimatedMonthlyCost: "120.50",
      diffMonthlyCost: "10.00",
      currency: "USD",
      breakdown: { total: 120.5 },
      measuredAt: new Date("2025-01-01"),
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    };
    mockFinOpsService.getCostEstimate.mockResolvedValue(estimate);

    const result = await controller.getCostEstimate("comp-1");

    expect(result.id).toBe("est-1");
    expect(result.estimatedMonthlyCost).toBe(120.5);
    expect(result.diffMonthlyCost).toBe(10);
    expect(result.currency).toBe("USD");
  });
});

// ---------------------------------------------------------------------------
// CatalogController — findComponentPipelines
// ---------------------------------------------------------------------------

import { PipelinesService } from "../pipelines/pipelines.service";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";

describe("CatalogController — findComponentPipelines", () => {
  const mockCatalogSvc = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    setContainerImage: jest.fn(),
  };

  const mockPipelinesSvc = {
    findByComponent: jest.fn(),
  };

  const mockPipeline = {
    id: "pipe-1",
    name: "build-staging",
    organizationId: "org-1",
    componentId: "comp-1",
    stages: [],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  describe("with PipelinesService available", () => {
    let controller: CatalogController;

    beforeEach(async () => {
      jest.clearAllMocks();
      const module: TestingModule = await Test.createTestingModule({
        controllers: [CatalogController],
        providers: [
          { provide: CatalogService, useValue: mockCatalogSvc },
          {
            provide: CACHE_MANAGER,
            useValue: {
              get: jest.fn(),
              set: jest.fn(),
              del: jest.fn(),
              clear: jest.fn(),
            },
          },
          {
            provide: PipelinesService,
            useValue: mockPipelinesSvc,
          },
        ],
      })
        .overrideGuard(OrgRequiredGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<CatalogController>(CatalogController);
    });

    it("returns paginated pipelines for the given component", async () => {
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
      mockCatalogSvc.findOne.mockResolvedValue({ id: "comp-1" });
      mockPipelinesSvc.findByComponent.mockResolvedValue([[mockPipeline], 1]);

      const result = await controller.findComponentPipelines(
        "comp-1",
        0,
        10,
        mockReq,
      );

      expect(result).toEqual({ items: [mockPipeline], total: 1 });
      expect(mockCatalogSvc.findOne).toHaveBeenCalledWith("comp-1", "org-uuid");
      expect(mockPipelinesSvc.findByComponent).toHaveBeenCalledWith(
        "comp-1",
        undefined,
        0,
        10,
      );
    });

    it("throws NotFoundException when the component does not exist", async () => {
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
      mockCatalogSvc.findOne.mockRejectedValue(
        new NotFoundException("Component comp-missing not found"),
      );

      await expect(
        controller.findComponentPipelines("comp-missing", 0, 10, mockReq),
      ).rejects.toThrow(NotFoundException);

      expect(mockPipelinesSvc.findByComponent).not.toHaveBeenCalled();
    });

    it("returns empty list when findByComponent returns no results", async () => {
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
      mockCatalogSvc.findOne.mockResolvedValue({ id: "comp-1" });
      mockPipelinesSvc.findByComponent.mockResolvedValue([[], 0]);

      const result = await controller.findComponentPipelines(
        "comp-1",
        0,
        10,
        mockReq,
      );

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe("without PipelinesService (optional dep absent)", () => {
    let controller: CatalogController;

    beforeEach(async () => {
      jest.clearAllMocks();
      // Do NOT provide PipelinesService — it is optional in the controller
      const module: TestingModule = await Test.createTestingModule({
        controllers: [CatalogController],
        providers: [
          { provide: CatalogService, useValue: mockCatalogSvc },
          {
            provide: CACHE_MANAGER,
            useValue: {
              get: jest.fn(),
              set: jest.fn(),
              del: jest.fn(),
              clear: jest.fn(),
            },
          },
        ],
      })
        .overrideGuard(OrgRequiredGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<CatalogController>(CatalogController);
    });

    it("returns empty list when PipelinesService is not injected", async () => {
      const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
      mockCatalogSvc.findOne.mockResolvedValue({ id: "comp-1" });

      const result = await controller.findComponentPipelines(
        "comp-1",
        0,
        10,
        mockReq,
      );

      expect(result).toEqual({ items: [], total: 0 });
    });
  });
});
