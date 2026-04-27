import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ComponentElasticsearchIndexService } from "./component-elasticsearch-index.service";
import { ComponentElasticsearchIndex } from "./entities/component-elasticsearch-index.entity";

/**
 * Unit tests for the admin overview helper added in FARM-T407.
 *
 * Lives in a separate spec file so the existing service spec is left
 * untouched (per repo convention: only add, never modify).
 */
describe("ComponentElasticsearchIndexService.findAllGroupedByComponent", () => {
  let service: ComponentElasticsearchIndexService;
  let repo: { find: jest.Mock };

  const baseDates = {
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const buildRecord = (
    overrides: Partial<ComponentElasticsearchIndex>,
  ): ComponentElasticsearchIndex => ({
    id: "00000000-0000-0000-0000-000000000000",
    componentId: "11111111-1111-1111-1111-111111111111",
    indexPattern: "logs-*",
    esUrl: null,
    description: null,
    organizationId: null,
    ...baseDates,
    ...overrides,
  });

  beforeEach(async () => {
    repo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComponentElasticsearchIndexService,
        {
          provide: getRepositoryToken(ComponentElasticsearchIndex),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get(ComponentElasticsearchIndexService);
  });

  afterEach(() => jest.clearAllMocks());

  it("returns an empty array when no records exist", async () => {
    const result = await service.findAllGroupedByComponent();
    expect(result).toEqual([]);
    expect(repo.find).toHaveBeenCalledWith({
      where: undefined,
      relations: ["component"],
      order: { indexPattern: "ASC" },
    });
  });

  it("groups by component, sorts alphabetically, and orders records", async () => {
    const compZebra = { id: "c-z", name: "zebra-svc" };
    const compApple = { id: "c-a", name: "apple-svc" };

    repo.find.mockResolvedValueOnce([
      buildRecord({
        id: "r1",
        componentId: compZebra.id,
        indexPattern: "logs-z-2",
        component: compZebra,
      }),
      buildRecord({
        id: "r2",
        componentId: compApple.id,
        indexPattern: "logs-a-2",
        component: compApple,
      }),
      buildRecord({
        id: "r3",
        componentId: compApple.id,
        indexPattern: "logs-a-1",
        component: compApple,
      }),
      buildRecord({
        id: "r4",
        componentId: compZebra.id,
        indexPattern: "logs-z-1",
        component: compZebra,
      }),
    ]);

    const groups = await service.findAllGroupedByComponent();

    expect(groups.map((g) => g.component.name)).toEqual([
      "apple-svc",
      "zebra-svc",
    ]);
    expect(groups[0].records.map((r) => r.indexPattern)).toEqual([
      "logs-a-1",
      "logs-a-2",
    ]);
    expect(groups[1].records.map((r) => r.indexPattern)).toEqual([
      "logs-z-1",
      "logs-z-2",
    ]);
  });

  it("applies the organization filter when provided", async () => {
    repo.find.mockResolvedValueOnce([]);
    await service.findAllGroupedByComponent("org-42");
    expect(repo.find).toHaveBeenCalledWith({
      where: { organizationId: "org-42" },
      relations: ["component"],
      order: { indexPattern: "ASC" },
    });
  });

  it("treats null organizationId as the global view (no filter)", async () => {
    repo.find.mockResolvedValueOnce([]);
    await service.findAllGroupedByComponent(null);
    expect(repo.find).toHaveBeenCalledWith({
      where: undefined,
      relations: ["component"],
      order: { indexPattern: "ASC" },
    });
  });

  it("skips records whose component relation is missing (orphans)", async () => {
    repo.find.mockResolvedValueOnce([
      buildRecord({
        id: "r1",
        componentId: "orphan",
        indexPattern: "logs-x",
        component: undefined,
      }),
    ]);
    const groups = await service.findAllGroupedByComponent();
    expect(groups).toEqual([]);
  });

  it("uses case-insensitive sorting for component names", async () => {
    const compA = { id: "c-a", name: "Alpha" };
    const compB = { id: "c-b", name: "bravo" };
    repo.find.mockResolvedValueOnce([
      buildRecord({
        id: "r1",
        componentId: compB.id,
        indexPattern: "p1",
        component: compB,
      }),
      buildRecord({
        id: "r2",
        componentId: compA.id,
        indexPattern: "p2",
        component: compA,
      }),
    ]);
    const groups = await service.findAllGroupedByComponent();
    expect(groups.map((g) => g.component.name)).toEqual(["Alpha", "bravo"]);
  });
});
