import { Test, TestingModule } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { getQueueToken } from "@nestjs/bullmq";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
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
    }).compile();

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
    expect(await controller.create(dto)).toEqual({ id: "1", ...dto });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it("should return all components with pagination", async () => {
    const items = [{ id: "1", name: "Test", type: "service" }];
    service.findAll.mockResolvedValue([items, 1]);
    const mockReq = { organizationId: undefined };
    const result = await controller.findAll(
      { skip: 0, take: 20 },
      mockReq as never,
    );
    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.data).toEqual(items);
    expect(result.total).toBe(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it("should return one component", async () => {
    service.findOne.mockResolvedValue({
      id: "1",
      name: "Test",
      type: "service",
    });
    expect(await controller.findOne("1")).toEqual({
      id: "1",
      name: "Test",
      type: "service",
    });
  });

  it("should update a component", async () => {
    service.update.mockResolvedValue({
      id: "1",
      name: "Updated",
      type: "service",
    });
    const updateDto: UpdateComponentDto = { name: "Updated" };
    expect(await controller.update("1", updateDto)).toEqual({
      id: "1",
      name: "Updated",
      type: "service",
    });
  });

  it("should remove a component (no content)", async () => {
    service.remove.mockResolvedValue({ deleted: true });
    expect(await controller.remove("1")).toBeUndefined();
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
});
