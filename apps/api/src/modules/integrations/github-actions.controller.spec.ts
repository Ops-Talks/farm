import { Test, TestingModule } from "@nestjs/testing";
import { GitHubActionsController } from "./github-actions.controller";
import { GitHubActionsService } from "./github-actions.service";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import type { GitHubActionsWorkflowRun } from "./github-actions.service";

describe("GitHubActionsController", () => {
  let controller: GitHubActionsController;
  let service: jest.Mocked<Pick<GitHubActionsService, "listWorkflowRuns">>;

  const mockRuns: GitHubActionsWorkflowRun[] = [
    {
      id: 1,
      name: "CI",
      status: "completed",
      conclusion: "success",
      headBranch: "main",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T01:00:00Z",
      htmlUrl: "https://github.com/acme/app/actions/runs/1",
    },
  ];

  beforeEach(async () => {
    service = {
      listWorkflowRuns: jest.fn().mockResolvedValue(mockRuns),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitHubActionsController],
      providers: [{ provide: GitHubActionsService, useValue: service }],
    }).compile();

    controller = module.get<GitHubActionsController>(GitHubActionsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listRuns()", () => {
    it("returns workflow runs from the service", async () => {
      const req = { organizationId: "org-1" } as RequestWithOrg;
      const result = await controller.listRuns(req);
      expect(service.listWorkflowRuns).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(mockRuns);
    });

    it("uses empty string when organizationId is not present", async () => {
      const req = {} as RequestWithOrg;
      service.listWorkflowRuns.mockResolvedValue([]);
      await controller.listRuns(req);
      expect(service.listWorkflowRuns).toHaveBeenCalledWith("");
    });

    it("forwards service errors to the caller", async () => {
      const req = { organizationId: "org-2" } as RequestWithOrg;
      service.listWorkflowRuns.mockRejectedValue(
        new Error("GitHub Actions credential not found"),
      );
      await expect(controller.listRuns(req)).rejects.toThrow(
        "GitHub Actions credential not found",
      );
    });
  });
});
