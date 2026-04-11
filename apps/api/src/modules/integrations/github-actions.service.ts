import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";

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
    const res = await globalThis.fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Farm-Portal/1.0",
      },
    });
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
}
