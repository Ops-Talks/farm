import { Test, TestingModule } from "@nestjs/testing";
import { TravisCIController } from "./travisci.controller";
import { TravisCIService } from "./travisci.service";

describe("TravisCIController", () => {
  let controller: TravisCIController;
  let travisCIService: { listBuilds: jest.Mock; restartBuild: jest.Mock };

  const mockBuild = {
    id: "123",
    number: 1,
    state: "passed",
    branch: "main",
    commit: "abc123",
    repository: { slug: "owner/repo" },
  };
  const mockRequest = { organizationId: "org-uuid-1" };

  beforeEach(async () => {
    travisCIService = {
      listBuilds: jest.fn().mockResolvedValue([mockBuild]),
      restartBuild: jest.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravisCIController],
      providers: [{ provide: TravisCIService, useValue: travisCIService }],
    }).compile();

    controller = module.get<TravisCIController>(TravisCIController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listBuilds", () => {
    it("should list builds using orgId from request when no query param is given", async () => {
      const result = await controller.listBuilds(
        undefined,
        undefined,
        mockRequest as never,
      );
      expect(result).toEqual([mockBuild]);
      expect(travisCIService.listBuilds).toHaveBeenCalledWith(
        "org-uuid-1",
        undefined,
      );
    });

    it("should use explicit orgId over request org", async () => {
      await controller.listBuilds(
        "owner/repo",
        "explicit-org",
        mockRequest as never,
      );
      expect(travisCIService.listBuilds).toHaveBeenCalledWith(
        "explicit-org",
        "owner/repo",
      );
    });

    it("should fall back to empty string when neither orgId nor request exist", async () => {
      await controller.listBuilds(undefined, undefined, undefined);
      expect(travisCIService.listBuilds).toHaveBeenCalledWith("", undefined);
    });
  });

  describe("restartBuild", () => {
    it("should restart a build using request org", async () => {
      const result = await controller.restartBuild(
        "123",
        undefined,
        mockRequest as never,
      );
      expect(result).toEqual({ ok: true });
      expect(travisCIService.restartBuild).toHaveBeenCalledWith(
        "org-uuid-1",
        "123",
      );
    });

    it("should use explicit orgId over request org", async () => {
      await controller.restartBuild("123", "org-2", mockRequest as never);
      expect(travisCIService.restartBuild).toHaveBeenCalledWith("org-2", "123");
    });

    it("should fall back to empty string when neither orgId nor request exist", async () => {
      await controller.restartBuild("123", undefined, undefined);
      expect(travisCIService.restartBuild).toHaveBeenCalledWith("", "123");
    });
  });
});
