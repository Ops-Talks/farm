import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
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

@Injectable()
export class GitHubActionsService {
  private readonly logger = new Logger(GitHubActionsService.name);

  constructor(
    private readonly httpService: HttpService,
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

  async listWorkflowRuns(orgId: string): Promise<GitHubActionsWorkflowRun[]> {
    const { token, owner, repo } = await this.resolveCredential(orgId);
    const url = repo
      ? `https://api.github.com/repos/${owner}/${repo}/actions/runs`
      : `https://api.github.com/orgs/${owner}/actions/runs`;
    let data: { workflow_runs?: unknown[] };
    try {
      const res = await this.cb.fire("github-actions", () =>
        firstValueFrom(
          this.httpService.get<{ workflow_runs?: unknown[] }>(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              "User-Agent": "Farm-Portal/1.0",
            },
            validateStatus: () => true,
          }),
        ),
      );
      if (res.status >= 400) {
        this.logger.warn(`GitHub Actions API returned ${res.status}`);
        return [];
      }
      data = res.data;
    } catch (err) {
      this.translateHttpError(err, "GitHubActionsService.listWorkflowRuns");
    }
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
      firstValueFrom(
        this.httpService.post(
          dispatchUrl,
          { ref },
          { headers, validateStatus: () => true },
        ),
      ),
    );

    if (dispatchRes.status >= 400) {
      const text =
        typeof dispatchRes.data === "string"
          ? dispatchRes.data
          : JSON.stringify(dispatchRes.data ?? "");
      throw new BadRequestException(
        `GitHub Actions dispatch failed: ${dispatchRes.status} ${text}`,
      );
    }

    const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=5&branch=${encodeURIComponent(ref)}&event=workflow_dispatch`;
    const before = new Date();

    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise<void>((r) => setTimeout(r, 2000));
      const runsRes = await this.cb.fire("github-actions", () =>
        firstValueFrom(
          this.httpService.get<{ workflow_runs?: Record<string, unknown>[] }>(
            runsUrl,
            {
              headers,
              validateStatus: () => true,
            },
          ),
        ),
      );
      if (runsRes.status >= 400) continue;
      const run = (runsRes.data.workflow_runs ?? []).find(
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
