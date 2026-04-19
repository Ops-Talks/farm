import { Test, TestingModule } from "@nestjs/testing";
import { SearchConfigController } from "./search-config.controller";
import { SearchService } from "./search.service";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import type { SearchConfig } from "./entities/search-config.entity";
import type { UpdateSearchConfigDto } from "./dto/update-search-config.dto";

/**
 * Unit tests for SearchConfigController.
 */
describe("SearchConfigController", () => {
  let controller: SearchConfigController;
  let searchService: jest.Mocked<
    Pick<SearchService, "getConfig" | "upsertConfig">
  >;

  const mockConfig: Partial<SearchConfig> = {
    id: "cfg-1",
    organizationId: "org-1",
    titleBoost: 3,
    tagsBoost: 2,
    descriptionBoost: 1,
    fuzziness: "AUTO",
  };

  beforeEach(async () => {
    searchService = {
      getConfig: jest.fn(),
      upsertConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchConfigController],
      providers: [{ provide: SearchService, useValue: searchService }],
    }).compile();

    controller = module.get<SearchConfigController>(SearchConfigController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // GET /search/config
  // ---------------------------------------------------------------------------

  describe("getConfig()", () => {
    it("calls searchService.getConfig with the orgId from request and returns result", async () => {
      searchService.getConfig.mockResolvedValue(mockConfig as SearchConfig);
      const req = { organizationId: "org-1" } as RequestWithOrg;

      const result = await controller.getConfig(req);

      expect(searchService.getConfig).toHaveBeenCalledWith("org-1");
      expect(result).toBe(mockConfig);
    });

    it("returns null when no config exists for the org", async () => {
      searchService.getConfig.mockResolvedValue(null);
      const req = { organizationId: "org-unknown" } as RequestWithOrg;

      const result = await controller.getConfig(req);

      expect(result).toBeNull();
    });

    it("passes undefined orgId when request has no organizationId", async () => {
      searchService.getConfig.mockResolvedValue(null);
      const req = {} as RequestWithOrg;

      await controller.getConfig(req);

      expect(searchService.getConfig).toHaveBeenCalledWith(undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /search/config
  // ---------------------------------------------------------------------------

  describe("upsertConfig()", () => {
    it("calls searchService.upsertConfig with dto and orgId and returns saved config", async () => {
      const dto: UpdateSearchConfigDto = { titleBoost: 5, fuzziness: "1" };
      const saved = {
        ...mockConfig,
        titleBoost: 5,
        fuzziness: "1",
      } as SearchConfig;
      searchService.upsertConfig.mockResolvedValue(saved);
      const req = { organizationId: "org-1" } as RequestWithOrg;

      const result = await controller.upsertConfig(dto, req);

      expect(searchService.upsertConfig).toHaveBeenCalledWith(dto, "org-1");
      expect(result).toBe(saved);
    });

    it("passes undefined orgId when request has no organizationId", async () => {
      const dto: UpdateSearchConfigDto = { tagsBoost: 4 };
      const saved = { ...mockConfig, tagsBoost: 4 } as SearchConfig;
      searchService.upsertConfig.mockResolvedValue(saved);
      const req = {} as RequestWithOrg;

      await controller.upsertConfig(dto, req);

      expect(searchService.upsertConfig).toHaveBeenCalledWith(dto, undefined);
    });
  });
});
