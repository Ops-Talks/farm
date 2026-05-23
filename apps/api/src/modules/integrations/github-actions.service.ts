import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";
import { translateHttpError } from "./http-error";

export interface GitHubActionsWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  headBranch: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

interface GitHubActionsCredentialPayload {
  token: string;
  owner: string;
  repo?: string;
}

/**
 * Service for interacting with the GitHub Actions API.
 * Credentials are stored as encrypted IntegrationCredential records.
 */
@Injectable()
export class GitHubActionsService {
  private readonly logger = new Logger(GitHubActionsService.name);

  constructor(
    private readonly credentialService: IntegrationCredentialService,
    private readonly cb: CircuitBreakerService,
  ) {}

  private async resolveCredential(
    orgId: string,
  ): Promise<GitHubActionsCredentialPayload> {
    const credential = await this.credentialService.findByType(
      orgId,
      IntegrationType.GITHUB_ACTIONS,
    );
    if (!credential) {
      throw new NotFoundException("GitHub Actions credential not found");
    }
    return JSON.parse(
      this.credentialService.decrypt(credential.encryptedValue),
    ) as GitHubActionsCredentialPayload;
  }

  /**
   * Lists recent GitHub Actions workflow runs for the configured owner/repo.
   *
   * @param orgId - Organization UUID
   */
  async listWorkflowRuns(orgId: string): Promise<GitHubActionsWorkflowRun[]> {
    const { token, owner, repo } = await this.resolveCredential(orgId);
    const url = repo
      ? `https://api.github.com/repos/${owner}/${repo}/actions/runs`
      : `https://api.github.com/orgs/${owner}/actions/runs`;
    let res: Response;
    try {
      res = await this.cb.fire("github-actions", () =>
        globalThis.fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "Farm-Portal/1.0",
          },
        }),
      );
    } catch (err) {
      this.translateHttpError(err, "GitHubActionsService.listWorkflowRuns");
    }
    if (!res.ok) {
      this.logger.warn(`GitHub Actions API returned ${res.status}`);
      return [];
    }
    const data = (await res.json()) as { workflow_runs?: unknown[] };
    const runs = data.workflow_runs ?? [];
    return (runs as Record<string, unknown>[]).map((r) => ({
      id: r.id as number,
      name: r.name as string,
      status: r.status as string,
      conclusion: (r.conclusion as string | null) ?? null,
      headBranch: r.head_branch as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      htmlUrl: r.html_url as string,
    }));
  }

  private translateHttpError(err: unknown, operation: string): never {
    return translateHttpError(err, operation, this.logger);
  }

  /**
   * Triggers a GitHub Actions workflow via workflow_dispatch and polls
   * for the newly created run ID (up to 10 seconds).
   *
   * @param orgId - Organization UUID
   * @param workflowId - Workflow file name or numeric ID (e.g. "deploy.yml")
   * @param ref - Git ref (branch, tag, SHA) to trigger
   * @returns The triggered workflow run or null if the run could not be found within the poll window
   */
  async triggerWorkflow(
    orgId: string,
    workflowId: string,
    ref: string,
  ): Promise<GitHubActionsWorkflowRun | null> {
    const { token, owner, repo } = await this.resolveCredential(orgId);
    if (!repo) {
      throw new BadRequestException(
        "GitHub Actions credential must include a repo to trigger workflows",
      );
    }
    const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "Farm-Portal/1.0",
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    };

    const dispatchRes = await this.cb.fire("github-actions", () =>
      globalThis.fetch(dispatchUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ ref }),
      }),
    );

    if (!dispatchRes.ok) {
      const text = await dispatchRes.text().catch(() => "");
      throw new BadRequestException(
        `GitHub Actions dispatch failed: ${dispatchRes.status} ${text}`,
      );
    }

    // Poll up to 10 seconds (5 x 2s) for the new run to appear.
    const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5&branch=${encodeURIComponent(ref)}&event=workflow_dispatch`;
    const before = new Date();

    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise<void>((r) => setTimeout(r, 2000));
      const runsRes = await this.cb.fire("github-actions", () =>
        globalThis.fetch(runsUrl, { headers }),
      );
      if (!runsRes.ok) continue;
      const data = (await runsRes.json()) as {
        workflow_runs?: Record<string, unknown>[];
      };
      const run = (data.workflow_runs ?? []).find(
        (r) => new Date(r["created_at"] as string) >= before,
      );
      if (run) {
        return {
          id: run["id"] as number,
          name: run["name"] as string,
          status: run["status"] as string,
          conclusion: (run["conclusion"] as string | null) ?? null,
          headBranch: run["head_branch"] as string,
          createdAt: run["created_at"] as string,
          updatedAt: run["updated_at"] as string,
          htmlUrl: run["html_url"] as string,
        };
      }
    }

    this.logger.warn(
      `Could not find newly triggered run for workflow ${workflowId} ref ${ref} within poll window`,
    );
    return null;
  }
}
