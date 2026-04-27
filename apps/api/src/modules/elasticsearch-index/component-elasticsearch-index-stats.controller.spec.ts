import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ComponentElasticsearchIndexController } from "./component-elasticsearch-index.controller";
import { ComponentElasticsearchIndexService } from "./component-elasticsearch-index.service";
import { ElasticsearchIndexStatsService } from "./elasticsearch-index-stats.service";
import { CatalogService } from "../catalog/catalog.service";
import { ComponentElasticsearchIndex } from "./entities/component-elasticsearch-index.entity";

/**
 * Unit tests for the stats endpoint added in FARM-T403.
 *
 * Lives in a separate spec file to avoid modifying the original
 * controller spec (per repo convention: only add, never modify).
 */
describe("ComponentElasticsearchIndexController (stats)", () => {
  let controller: ComponentElasticsearchIndexController;
  let service: Record<string, jest.Mock>;
  let statsService: Record<string, jest.Mock>;
  let catalogService: Record<string, jest.Mock>;

  const componentId = "11111111-1111-1111-1111-111111111111";

  const recordA: ComponentElasticsearchIndex = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    componentId,
    indexPattern: "logs-a-*",
    esUrl: "http://es-a.test",
    description: null,
    organizationId: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const recordB: ComponentElasticsearchIndex = {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    componentId,
    indexPattern: "logs-b-*",
    esUrl: null,
    description: null,
    organizationId: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    service = {
      findByComponent: jest.fn().mockResolvedValue([recordA, recordB]),
    };
    statsService = {
      getIndexStats: jest
        .fn()
        .mockResolvedValueOnce({
          reachable: true,
          stats: [
            {
              pattern: "logs-a-*",
              index: "logs-a-001",
              health: "green",
              status: "open",
              docsCount: 10,
              storeSize: "1kb",
            },
          ],
        })
        .mockResolvedValueOnce({ reachable: false }),
    };
    catalogService = {
      findOne: jest.fn().mockResolvedValue({ id: componentId }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComponentElasticsearchIndexController],
      providers: [
        { provide: ComponentElasticsearchIndexService, useValue: service },
        { provide: ElasticsearchIndexStatsService, useValue: statsService },
        { provide: CatalogService, useValue: catalogService },
      ],
    }).compile();

    controller = module.get(ComponentElasticsearchIndexController);
  });

  afterEach(() => jest.clearAllMocks());

  it("aggregates per-record stats, preserving DB order", async () => {
    const result = await controller.getStats(componentId, {});

    expect(catalogService.findOne).toHaveBeenCalledWith(componentId);
    expect(service.findByComponent).toHaveBeenCalledWith(componentId, null);
    expect(statsService.getIndexStats).toHaveBeenNthCalledWith(
      1,
      ["logs-a-*"],
      "http://es-a.test",
    );
    expect(statsService.getIndexStats).toHaveBeenNthCalledWith(
      2,
      ["logs-b-*"],
      null,
    );

    expect(result).toEqual([
      {
        indexId: recordA.id,
        indexPattern: "logs-a-*",
        esUrl: "http://es-a.test",
        reachable: true,
        stats: {
          pattern: "logs-a-*",
          index: "logs-a-001",
          health: "green",
          status: "open",
          docsCount: 10,
          storeSize: "1kb",
        },
      },
      {
        indexId: recordB.id,
        indexPattern: "logs-b-*",
        esUrl: null,
        reachable: false,
      },
    ]);
  });

  it("returns an empty array when no indices are linked", async () => {
    service.findByComponent.mockResolvedValueOnce([]);
    const result = await controller.getStats(componentId, {});
    expect(result).toEqual([]);
    expect(statsService.getIndexStats).not.toHaveBeenCalled();
  });

  it("propagates NotFoundException from catalog lookup", async () => {
    catalogService.findOne.mockRejectedValueOnce(
      new NotFoundException("missing"),
    );
    await expect(controller.getStats(componentId, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
