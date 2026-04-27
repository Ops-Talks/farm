import { Test, TestingModule } from "@nestjs/testing";
import { ElasticsearchIndicesOverviewController } from "./elasticsearch-indices-overview.controller";
import { ComponentElasticsearchIndexService } from "./component-elasticsearch-index.service";
import { ElasticsearchIndexStatsService } from "./elasticsearch-index-stats.service";
import { ComponentElasticsearchIndex } from "./entities/component-elasticsearch-index.entity";

/**
 * Unit tests for the admin overview controller (FARM-T407).
 */
describe("ElasticsearchIndicesOverviewController", () => {
  let controller: ElasticsearchIndicesOverviewController;
  let indexService: { findAllGroupedByComponent: jest.Mock };
  let statsService: { getIndexStats: jest.Mock };

  const compA = { id: "c-a", name: "alpha" };
  const compB = { id: "c-b", name: "bravo" };

  const baseDates = {
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mkRecord = (
    overrides: Partial<ComponentElasticsearchIndex>,
  ): ComponentElasticsearchIndex => ({
    id: "00000000-0000-0000-0000-000000000000",
    componentId: compA.id,
    indexPattern: "logs-*",
    esUrl: null,
    description: null,
    organizationId: null,
    ...baseDates,
    ...overrides,
  });

  beforeEach(async () => {
    indexService = { findAllGroupedByComponent: jest.fn() };
    statsService = { getIndexStats: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ElasticsearchIndicesOverviewController],
      providers: [
        { provide: ComponentElasticsearchIndexService, useValue: indexService },
        { provide: ElasticsearchIndexStatsService, useValue: statsService },
      ],
    }).compile();

    controller = module.get(ElasticsearchIndicesOverviewController);
  });

  afterEach(() => jest.clearAllMocks());

  it("returns an empty array and skips stats when no groups exist", async () => {
    indexService.findAllGroupedByComponent.mockResolvedValueOnce([]);
    const result = await controller.getOverview({});
    expect(result).toEqual([]);
    expect(statsService.getIndexStats).not.toHaveBeenCalled();
  });

  it("forwards the organizationId from the request to the service", async () => {
    indexService.findAllGroupedByComponent.mockResolvedValueOnce([]);
    await controller.getOverview({
      organizationId: "org-42",
    });
    expect(indexService.findAllGroupedByComponent).toHaveBeenCalledWith(
      "org-42",
    );
  });

  it("passes null when no organization context is present", async () => {
    indexService.findAllGroupedByComponent.mockResolvedValueOnce([]);
    await controller.getOverview({});
    expect(indexService.findAllGroupedByComponent).toHaveBeenCalledWith(null);
  });

  it("batches stats calls per unique esUrl group", async () => {
    indexService.findAllGroupedByComponent.mockResolvedValueOnce([
      {
        component: compA,
        records: [
          mkRecord({
            id: "r1",
            indexPattern: "logs-a-1",
            esUrl: "http://es-1.test",
          }),
          mkRecord({
            id: "r2",
            indexPattern: "logs-a-2",
            esUrl: "http://es-1.test",
          }),
        ],
      },
      {
        component: compB,
        records: [
          mkRecord({
            id: "r3",
            componentId: compB.id,
            indexPattern: "logs-b-1",
            esUrl: "http://es-2.test",
          }),
          mkRecord({
            id: "r4",
            componentId: compB.id,
            indexPattern: "logs-b-2",
            esUrl: null,
          }),
        ],
      },
    ]);

    statsService.getIndexStats.mockImplementation(
      (patterns: string[], esUrl: string | null) => {
        return Promise.resolve({
          reachable: true,
          stats: patterns.map((p) => ({
            pattern: p,
            index: `${p}-concrete`,
            health: "green" as const,
            status: "open",
            docsCount: 1,
            storeSize: "1kb",
            __url: esUrl,
          })),
        });
      },
    );

    const result = await controller.getOverview({});

    // Three unique URL groups: "http://es-1.test", "http://es-2.test", null.
    expect(statsService.getIndexStats).toHaveBeenCalledTimes(3);

    // Verify result structure & ordering propagated from the service.
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      componentId: compA.id,
      componentName: compA.name,
      indices: [
        expect.objectContaining({
          indexId: "r1",
          indexPattern: "logs-a-1",
          esUrl: "http://es-1.test",
          reachable: true,
        }),
        expect.objectContaining({
          indexId: "r2",
          indexPattern: "logs-a-2",
          esUrl: "http://es-1.test",
          reachable: true,
        }),
      ],
    });
    expect(result[1].indices.map((i) => i.indexPattern)).toEqual([
      "logs-b-1",
      "logs-b-2",
    ]);
    expect(result[0].indices[0].stats?.index).toBe("logs-a-1-concrete");
  });

  it("emits reachable: false for every record in an unreachable URL group", async () => {
    indexService.findAllGroupedByComponent.mockResolvedValueOnce([
      {
        component: compA,
        records: [
          mkRecord({ id: "r1", indexPattern: "logs-a", esUrl: null }),
          mkRecord({ id: "r2", indexPattern: "logs-b", esUrl: null }),
        ],
      },
    ]);
    statsService.getIndexStats.mockResolvedValueOnce({ reachable: false });

    const result = await controller.getOverview({});

    expect(statsService.getIndexStats).toHaveBeenCalledTimes(1);
    expect(result[0].indices).toEqual([
      {
        indexId: "r1",
        indexPattern: "logs-a",
        esUrl: null,
        reachable: false,
      },
      {
        indexId: "r2",
        indexPattern: "logs-b",
        esUrl: null,
        reachable: false,
      },
    ]);
    for (const entry of result[0].indices) {
      expect(entry).not.toHaveProperty("stats");
    }
  });

  it("maps healthy stats correctly back to each record", async () => {
    indexService.findAllGroupedByComponent.mockResolvedValueOnce([
      {
        component: compA,
        records: [
          mkRecord({
            id: "r1",
            indexPattern: "logs-a-*",
            esUrl: "http://es.test",
          }),
        ],
      },
    ]);
    statsService.getIndexStats.mockResolvedValueOnce({
      reachable: true,
      stats: [
        {
          pattern: "logs-a-*",
          index: "logs-a-2026.04.27",
          health: "green",
          status: "open",
          docsCount: 999,
          storeSize: "5mb",
        },
      ],
    });

    const result = await controller.getOverview({});

    expect(result[0].indices[0]).toEqual({
      indexId: "r1",
      indexPattern: "logs-a-*",
      esUrl: "http://es.test",
      reachable: true,
      stats: {
        pattern: "logs-a-*",
        index: "logs-a-2026.04.27",
        health: "green",
        status: "open",
        docsCount: 999,
        storeSize: "5mb",
      },
    });
  });
});
