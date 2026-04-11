import { Test, TestingModule } from "@nestjs/testing";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { QuickSearchResult } from "./search.service";

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
      const result = await controller.quickSearch("user", "5");
      expect(searchService.quickSearch).toHaveBeenCalledWith("user", 5);
      expect(result).toEqual(mockResults);
    });

    it("uses default limit of 10 when limit param is not provided", async () => {
      await controller.quickSearch("user");
      expect(searchService.quickSearch).toHaveBeenCalledWith("user", 10);
    });

    it("passes empty string when q is undefined", async () => {
      await controller.quickSearch(undefined as unknown as string);
      expect(searchService.quickSearch).toHaveBeenCalledWith("", 10);
    });

    it("returns empty array for short queries", async () => {
      searchService.quickSearch.mockResolvedValue([]);
      const result = await controller.quickSearch("a");
      expect(result).toEqual([]);
    });
  });
});
