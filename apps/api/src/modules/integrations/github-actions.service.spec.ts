import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { GitHubActionsService } from "./github-actions.service";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";

describe("GitHubActionsService", () => {
  let service: GitHubActionsService;
  const mockCredentialService = {
    findByType: jest.fn(),
    decrypt: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  };

  const encryptedCredential = {
    id: "cred-1",
    orgId: "org-1",
    type: IntegrationType.GITHUB_ACTIONS,
    encryptedValue: "encrypted-blob",
    name: "gh-actions",
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubActionsService,
        {
          provide: IntegrationCredentialService,
          useValue: mockCredentialService,
        },
        {
          provide: CircuitBreakerService,
          useValue: { fire: jest.fn((_, fn: () => unknown) => fn()) },
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<GitHubActionsService>(GitHubActionsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("listWorkflowRuns()", () => {
    it("throws NotFoundException when credential is not found", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(service.listWorkflowRuns("org-1")).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCredentialService.findByType).toHaveBeenCalledWith(
        "org-1",
        IntegrationType.GITHUB_ACTIONS,
      );
    });

    it("returns mapped workflow runs on success", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({ token: "gh-token", owner: "acme", repo: "my-app" }),
      );

      const mockRun = {
        id: 123,
        name: "CI",
        status: "completed",
        conclusion: "success",
        head_branch: "main",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
        html_url: "https://github.com/acme/my-app/actions/runs/123",
      };

      mockHttpService.get.mockReturnValue(
        of({
          data: { workflow_runs: [mockRun] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const result = await service.listWorkflowRuns("org-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 123,
        name: "CI",
        status: "completed",
        conclusion: "success",
        headBranch: "main",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T01:00:00Z",
        htmlUrl: "https://github.com/acme/my-app/actions/runs/123",
      });
    });

    it("returns empty array when GitHub API returns non-ok status", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({ token: "gh-token", owner: "acme", repo: "my-app" }),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: null,
          status: 403,
          statusText: "Forbidden",
          headers: {},
          config: {},
        }),
      );

      const result = await service.listWorkflowRuns("org-1");

      expect(result).toEqual([]);
    });

    it("uses org-level actions/runs endpoint when repo is not provided", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({ token: "gh-token", owner: "acme" }),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: { workflow_runs: [] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      await service.listWorkflowRuns("org-1");

      expect(mockHttpService.get).toHaveBeenCalledWith(
        "https://api.github.com/orgs/acme/actions/runs",
        expect.any(Object),
      );
    });

    it("returns empty array when API response has no workflow_runs property", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({ token: "gh-token", owner: "acme", repo: "my-app" }),
      );

      // Response with no workflow_runs field — exercises `data.workflow_runs ?? []` right branch.
      mockHttpService.get.mockReturnValue(
        of({
          data: {},
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const result = await service.listWorkflowRuns("org-1");
      expect(result).toEqual([]);
    });

    it("maps null conclusion correctly", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({ token: "gh-token", owner: "acme", repo: "my-app" }),
      );

      // Run with conclusion=null exercises the `?? null` right-hand branch.
      const runWithNullConclusion = {
        id: 99,
        name: "Nightly",
        status: "in_progress",
        conclusion: null,
        head_branch: "develop",
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-01T00:30:00Z",
        html_url: "https://github.com/acme/my-app/actions/runs/99",
      };

      mockHttpService.get.mockReturnValue(
        of({
          data: { workflow_runs: [runWithNullConclusion] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const result = await service.listWorkflowRuns("org-1");

      expect(result).toHaveLength(1);
      expect(result[0].conclusion).toBeNull();
    });

    it("throws ServiceUnavailableException when fetch() raises a network TypeError", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({ token: "gh-token", owner: "acme", repo: "my-app" }),
      );

      mockHttpService.get.mockReturnValue(
        throwError(() => new TypeError("Failed to fetch")),
      );

      await expect(service.listWorkflowRuns("org-1")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // triggerWorkflow()
  // -------------------------------------------------------------------------

  describe("triggerWorkflow()", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({
          token: "gh-token",
          owner: "acme",
          repo: "my-app",
        }),
      );
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("throws NotFoundException when credential is not found", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(
        service.triggerWorkflow("org-1", "deploy.yml", "main"),
      ).rejects.toThrow(NotFoundException);
    });

    it("dispatches workflow_dispatch and returns the matching run after polling", async () => {
      // Use a far-future date so `new Date(created_at) >= before` is always true.
      const mockWorkflowRun = {
        id: 42,
        name: "Deploy",
        status: "queued",
        conclusion: null,
        head_branch: "main",
        created_at: "2099-01-01T00:00:00Z",
        updated_at: "2099-01-01T00:00:01Z",
        html_url: "https://github.com/acme/my-app/actions/runs/42",
      };

      mockHttpService.post.mockReturnValueOnce(
        of({
          data: null,
          status: 204,
          statusText: "No Content",
          headers: {},
          config: {},
        }),
      );
      mockHttpService.get.mockReturnValueOnce(
        of({
          data: { workflow_runs: [mockWorkflowRun] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const resultPromise = service.triggerWorkflow(
        "org-1",
        "deploy.yml",
        "main",
      );
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).not.toBeNull();
      expect(result?.id).toBe(42);
      expect(result?.headBranch).toBe("main");
      expect(result?.htmlUrl).toBe(
        "https://github.com/acme/my-app/actions/runs/42",
      );
    });

    it("throws BadRequestException when dispatch returns a non-2xx status", async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: "Unprocessable Entity",
          status: 422,
          statusText: "Unprocessable Entity",
          headers: {},
          config: {},
        }),
      );

      await expect(
        service.triggerWorkflow("org-1", "deploy.yml", "main"),
      ).rejects.toThrow();
    });

    it("throws BadRequestException when repo is not in the credential", async () => {
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({ token: "gh-token", owner: "acme" }),
      );

      await expect(
        service.triggerWorkflow("org-1", "deploy.yml", "main"),
      ).rejects.toThrow();
    });

    it("returns null when no matching run is found after all polling attempts", async () => {
      mockHttpService.post.mockReturnValueOnce(
        of({
          data: null,
          status: 204,
          statusText: "No Content",
          headers: {},
          config: {},
        }),
      );
      mockHttpService.get.mockReturnValue(
        of({
          data: { workflow_runs: [] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const resultPromise = service.triggerWorkflow(
        "org-1",
        "deploy.yml",
        "main",
      );
      await jest.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBeNull();
    });

    it("sends the provided ref in the dispatch body", async () => {
      mockHttpService.post.mockReturnValueOnce(
        of({
          data: null,
          status: 204,
          statusText: "No Content",
          headers: {},
          config: {},
        }),
      );
      mockHttpService.get.mockReturnValue(
        of({
          data: { workflow_runs: [] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
        }),
      );

      const resultPromise = service.triggerWorkflow(
        "org-1",
        "deploy.yml",
        "main",
      );
      await jest.runAllTimersAsync();
      await resultPromise;

      const dispatchCall = mockHttpService.post.mock.calls[0] as [
        string,
        unknown,
      ];
      const body = dispatchCall[1] as { ref: string };
      expect(body.ref).toBe("main");
    });
  });
});
