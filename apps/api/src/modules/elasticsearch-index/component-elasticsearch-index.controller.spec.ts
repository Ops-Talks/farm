import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ComponentElasticsearchIndexController } from "./component-elasticsearch-index.controller";
import { ComponentElasticsearchIndexService } from "./component-elasticsearch-index.service";
import { ComponentElasticsearchIndex } from "./entities/component-elasticsearch-index.entity";

describe("ComponentElasticsearchIndexController", () => {
  let controller: ComponentElasticsearchIndexController;
  let service: Record<string, jest.Mock>;

  const componentId = "11111111-1111-1111-1111-111111111111";
  const indexId = "22222222-2222-2222-2222-222222222222";

  const mockEntity: ComponentElasticsearchIndex = {
    id: indexId,
    componentId,
    indexPattern: "logs-app-*",
    esUrl: null,
    description: null,
    organizationId: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    service = {
      findByComponent: jest.fn().mockResolvedValue([mockEntity]),
      create: jest.fn().mockResolvedValue(mockEntity),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComponentElasticsearchIndexController],
      providers: [
        { provide: ComponentElasticsearchIndexService, useValue: service },
      ],
    }).compile();

    controller = module.get(ComponentElasticsearchIndexController);
  });

  afterEach(() => jest.clearAllMocks());

  it("findByComponent delegates to service", async () => {
    const result = await controller.findByComponent(componentId);
    expect(service.findByComponent).toHaveBeenCalledWith(componentId);
    expect(result).toEqual([mockEntity]);
  });

  it("create delegates to service with componentId and dto", async () => {
    const dto = { indexPattern: "logs-app-*" };
    const result = await controller.create(componentId, dto);
    expect(service.create).toHaveBeenCalledWith(componentId, dto);
    expect(result).toEqual(mockEntity);
  });

  // FARM-ST410: controller-level - 409 when service signals duplicate
  it("propagates ConflictException from create when a duplicate exists", async () => {
    service.create.mockRejectedValueOnce(new ConflictException("duplicate"));
    await expect(
      controller.create(componentId, { indexPattern: "logs-app-*" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("remove delegates to service with both ids", async () => {
    await controller.remove(componentId, indexId);
    expect(service.remove).toHaveBeenCalledWith(componentId, indexId);
  });

  // FARM-ST411: controller-level - 404 when service signals missing id
  it("propagates NotFoundException from remove when the id is missing", async () => {
    service.remove.mockRejectedValueOnce(new NotFoundException("missing"));
    await expect(
      controller.remove(componentId, indexId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
