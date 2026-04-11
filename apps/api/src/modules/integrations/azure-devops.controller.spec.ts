import { Test, TestingModule } from "@nestjs/testing";
import { AzureDevOpsController } from "./azure-devops.controller";
import { AzureDevOpsService } from "./azure-devops.service";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import type { AzureDevOpsPipelineRun } from "./azure-devops.service";

describe("AzureDevOpsController", () => {
  let controller: AzureDevOpsController;
  let service: jest.Mocked<Pick<AzureDevOpsService, "listPipelines">>;

  const mockPipelines: AzureDevOpsPipelineRun[] = [
    {
      id: 10,
      name: "Build Pipeline",
      state: "completed",
      result: "succeeded",
      createdDate: "2024-01-01T00:00:00Z",
      finishedDate: "2024-01-01T01:00:00Z",
      pipeline: { id: 10, name: "Build Pipeline" },
    },
  ];

  beforeEach(async () => {
    service = {
      listPipelines: jest.fn().mockResolvedValue(mockPipelines),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AzureDevOpsController],
      providers: [{ provide: AzureDevOpsService, useValue: service }],
    }).compile();

    controller = module.get<AzureDevOpsController>(AzureDevOpsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listPipelines()", () => {
    it("returns pipeline runs from the service", async () => {
      const req = { organizationId: "org-1" } as RequestWithOrg;
      const result = await controller.listPipelines(req);
      expect(service.listPipelines).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(mockPipelines);
    });

    it("uses empty string when organizationId is not present", async () => {
      const req = {} as RequestWithOrg;
      service.listPipelines.mockResolvedValue([]);
      await controller.listPipelines(req);
      expect(service.listPipelines).toHaveBeenCalledWith("");
    });

    it("forwards service errors to the caller", async () => {
      const req = { organizationId: "org-2" } as RequestWithOrg;
      service.listPipelines.mockRejectedValue(
        new Error("Azure DevOps credential not found"),
      );
      await expect(controller.listPipelines(req)).rejects.toThrow(
        "Azure DevOps credential not found",
      );
    });
  });
});
