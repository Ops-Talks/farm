import { Test, TestingModule } from "@nestjs/testing";
import { CircleCIController } from "./circleci.controller";
import { CircleCIService } from "./circleci.service";

describe("CircleCIController", () => {
  let controller: CircleCIController;
  let circleCIService: { listPipelines: jest.Mock; triggerPipeline: jest.Mock };

  const mockPipeline = {
    id: "pipe-1",
    state: "created",
    trigger_parameters: {},
    vcs: {},
  };
  const mockRequest = { organizationId: "org-uuid-1" };

  beforeEach(async () => {
    circleCIService = {
      listPipelines: jest.fn().mockResolvedValue([mockPipeline]),
      triggerPipeline: jest
        .fn()
        .mockResolvedValue({ id: "pipe-new", state: "pending" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CircleCIController],
      providers: [{ provide: CircleCIService, useValue: circleCIService }],
    }).compile();

    controller = module.get<CircleCIController>(CircleCIController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listPipelines", () => {
    it("should list pipelines using request org when no orgId provided", async () => {
      const result = await controller.listPipelines(
        undefined,
        undefined,
        mockRequest,
      );
      expect(result).toEqual([mockPipeline]);
      expect(circleCIService.listPipelines).toHaveBeenCalledWith(
        "org-uuid-1",
        undefined,
      );
    });

    it("should use explicit orgId over request org", async () => {
      await controller.listPipelines("vcs-url", "explicit-org", mockRequest);
      expect(circleCIService.listPipelines).toHaveBeenCalledWith(
        "explicit-org",
        "vcs-url",
      );
    });

    it("should fall back to empty string when neither orgId nor request exist", async () => {
      await controller.listPipelines(undefined, undefined, undefined);
      expect(circleCIService.listPipelines).toHaveBeenCalledWith("", undefined);
    });
  });

  describe("triggerPipeline", () => {
    it("should trigger pipeline using request org", async () => {
      const result = await controller.triggerPipeline(
        "my-slug",
        undefined,
        undefined,
        mockRequest,
      );
      expect(result).toEqual({ id: "pipe-new", state: "pending" });
      expect(circleCIService.triggerPipeline).toHaveBeenCalledWith(
        "org-uuid-1",
        "my-slug",
        undefined,
      );
    });

    it("should use explicit orgId when provided", async () => {
      await controller.triggerPipeline(
        "my-slug",
        undefined,
        "org-2",
        mockRequest,
      );
      expect(circleCIService.triggerPipeline).toHaveBeenCalledWith(
        "org-2",
        "my-slug",
        undefined,
      );
    });

    it("should fall back to empty string when neither orgId nor request exist", async () => {
      await controller.triggerPipeline(
        "my-slug",
        undefined,
        undefined,
        undefined,
      );
      expect(circleCIService.triggerPipeline).toHaveBeenCalledWith(
        "",
        "my-slug",
        undefined,
      );
    });
  });
});
