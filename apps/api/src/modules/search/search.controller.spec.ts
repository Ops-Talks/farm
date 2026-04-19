import { Test, TestingModule } from "@nestjs/testing";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { QuickSearchResult } from "./search.service";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import type { AdvancedSearchQueryDto } from "./dto/advanced-search-query.dto";
import type { AdvancedSearchResult } from "./interfaces/advanced-search-result.interface";

describe("SearchController", () => {
  let controller: SearchController;
  let searchService: jest.Mocked<
    Pick<SearchService, "quickSearch" | "advancedSearch">
  >;

  const mockResults: QuickSearchResult[] = [
    {
      type: "component",
      id: "c-1",
      name: "user-service",
      description: "Handles user auth",
      url: "/catalog/c-1",
    },
    {
      type: "team",
      id: "t-1",
      name: "platform team",
      url: "/teams/t-1",
    },
  ];

  beforeEach(async () => {
    searchService = {
      quickSearch: jest.fn().mockResolvedValue(mockResults),
      advancedSearch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: searchService }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("quickSearch()", () => {
    it("calls searchService.quickSearch with correct params and returns results", async () => {
      const req = { organizationId: "org-1" } as RequestWithOrg;
      const result = await controller.quickSearch("user", "5", req);
      expect(searchService.quickSearch).toHaveBeenCalledWith(
        "user",
        5,
        "org-1",
      );
      expect(result).toEqual(mockResults);
    });

    it("uses default limit of 10 when limit param is not provided", async () => {
      const req = { organizationId: "org-1" } as RequestWithOrg;
      await controller.quickSearch("user", undefined, req);
      expect(searchService.quickSearch).toHaveBeenCalledWith(
        "user",
        10,
        "org-1",
      );
    });

    it("passes empty string when q is undefined", async () => {
      const req = {} as RequestWithOrg;
      await controller.quickSearch(
        undefined as unknown as string,
        undefined,
        req,
      );
      expect(searchService.quickSearch).toHaveBeenCalledWith("", 10, undefined);
    });

    it("returns empty array for short queries", async () => {
      searchService.quickSearch.mockResolvedValue([]);
      const req = {} as RequestWithOrg;
      const result = await controller.quickSearch("a", undefined, req);
      expect(result).toEqual([]);
    });

    it("defaults limit to 10 when limit is NaN", async () => {
      const req = {} as RequestWithOrg;
      await controller.quickSearch("test", "abc", req);
      expect(searchService.quickSearch).toHaveBeenCalledWith(
        "test",
        10,
        undefined,
      );
    });

    it("clamps limit to 100 when too large", async () => {
      const req = {} as RequestWithOrg;
      await controller.quickSearch("test", "500", req);
      expect(searchService.quickSearch).toHaveBeenCalledWith(
        "test",
        100,
        undefined,
      );
    });

    it("clamps limit to 1 when zero or negative", async () => {
      const req = {} as RequestWithOrg;
      await controller.quickSearch("test", "0", req);
      expect(searchService.quickSearch).toHaveBeenCalledWith(
        "test",
        1,
        undefined,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // advancedSearch() — FARM-S316
  // ---------------------------------------------------------------------------

  describe("advancedSearch()", () => {
    const mockAdvancedResult: AdvancedSearchResult = {
      hits: [
        {
          id: "c-1",
          type: "component",
          title: "platform-service",
          url: "/catalog/c-1",
          score: 3.5,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      facets: {
        types: [{ key: "component", count: 1 }],
        tags: [],
      },
      source: "elasticsearch",
    };

    it("calls searchService.advancedSearch with the DTO and orgId", async () => {
      searchService.advancedSearch.mockResolvedValue(mockAdvancedResult);
      const req = { organizationId: "org-42" } as RequestWithOrg;
      const dto: AdvancedSearchQueryDto = { q: "platform", page: 1, limit: 20 };

      const result = await controller.advancedSearch(dto, req);

      expect(searchService.advancedSearch).toHaveBeenCalledWith(dto, "org-42");
      expect(result).toBe(mockAdvancedResult);
    });

    it("passes undefined orgId when no organizationId is present on request", async () => {
      searchService.advancedSearch.mockResolvedValue(mockAdvancedResult);
      const req = {} as RequestWithOrg;
      const dto: AdvancedSearchQueryDto = { q: "test", page: 1, limit: 10 };

      await controller.advancedSearch(dto, req);

      expect(searchService.advancedSearch).toHaveBeenCalledWith(dto, undefined);
    });

    it("returns the result from the service unchanged", async () => {
      searchService.advancedSearch.mockResolvedValue(mockAdvancedResult);
      const dto: AdvancedSearchQueryDto = { q: "infra" };

      const result = await controller.advancedSearch(dto);

      expect(result).toBe(mockAdvancedResult);
    });
  });
});
