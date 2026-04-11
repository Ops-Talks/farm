import { Test, TestingModule } from "@nestjs/testing";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { QuickSearchResult } from "./search.service";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";

describe("SearchController", () => {
  let controller: SearchController;
  let searchService: jest.Mocked<Pick<SearchService, "quickSearch">>;

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
});
