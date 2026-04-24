import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { GitHubActionsService } from "./github-actions.service";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";

describe("GitHubActionsService", () => {
  let service: GitHubActionsService;
  let originalFetch: typeof globalThis.fetch;

  const mockCredentialService = {
    findByType: jest.fn(),
    decrypt: jest.fn(),
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
    originalFetch = globalThis.fetch;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubActionsService,
        {
          provide: IntegrationCredentialService,
          useValue: mockCredentialService,
        },
      ],
    }).compile();

    service = module.get<GitHubActionsService>(GitHubActionsService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
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

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ workflow_runs: [mockRun] }),
      });

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

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const result = await service.listWorkflowRuns("org-1");

      expect(result).toEqual([]);
    });

    it("uses org-level actions/runs endpoint when repo is not provided", async () => {
      mockCredentialService.findByType.mockResolvedValue(encryptedCredential);
      mockCredentialService.decrypt.mockReturnValue(
        JSON.stringify({ token: "gh-token", owner: "acme" }),
      );

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ workflow_runs: [] }),
      });

      await service.listWorkflowRuns("org-1");

      expect(globalThis.fetch).toHaveBeenCalledWith(
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
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

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

      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest
          .fn()
          .mockResolvedValue({ workflow_runs: [runWithNullConclusion] }),
      });

      const result = await service.listWorkflowRuns("org-1");

      expect(result).toHaveLength(1);
      expect(result[0].conclusion).toBeNull();
    });
  });
});
