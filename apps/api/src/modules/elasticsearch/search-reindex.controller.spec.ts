import { Test, TestingModule } from "@nestjs/testing";
import { SearchReindexController } from "./search-reindex.controller";
import { SearchIndexService } from "./search-index.service";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";

/**
 * Unit tests for SearchReindexController.
 */
describe("SearchReindexController", () => {
  let controller: SearchReindexController;

  const mockSearchIndexService = {
    reindexAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchReindexController],
      providers: [
        {
          provide: SearchIndexService,
          useValue: mockSearchIndexService,
        },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SearchReindexController>(SearchReindexController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // POST /reindex
  // ---------------------------------------------------------------------------

  describe("reindex()", () => {
    it("calls searchIndexService.reindexAll with the organizationId from the request", async () => {
      mockSearchIndexService.reindexAll.mockResolvedValue({ indexed: 42 });

      const req: RequestWithOrg = { organizationId: "org-123" };
      await controller.reindex(req);

      expect(mockSearchIndexService.reindexAll).toHaveBeenCalledWith("org-123");
    });

    it("returns the correct response shape with message and indexed count", async () => {
      mockSearchIndexService.reindexAll.mockResolvedValue({ indexed: 17 });

      const req: RequestWithOrg = { organizationId: "org-99" };
      const result = await controller.reindex(req);

      expect(result).toEqual({ message: "Reindex started", indexed: 17 });
    });

    it("passes undefined when no organizationId is present in the request", async () => {
      mockSearchIndexService.reindexAll.mockResolvedValue({ indexed: 0 });

      const req: RequestWithOrg = {};
      await controller.reindex(req);

      expect(mockSearchIndexService.reindexAll).toHaveBeenCalledWith(undefined);
    });
  });
});
