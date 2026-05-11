import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";
import { translateHttpError } from "./http-error";

export interface AzureDevOpsPipelineRun {
  id: number;
  name: string;
  state: string;
  result: string | null;
  createdDate: string;
  finishedDate: string | null;
  pipeline: { name: string; id: number };
}

interface AzureDevOpsCredentialPayload {
  token: string;
  organization: string;
  project: string;
}

/**
 * Service for interacting with the Azure DevOps Pipelines API.
 * Credentials are stored as encrypted IntegrationCredential records.
 */
@Injectable()
export class AzureDevOpsService {
  private readonly logger = new Logger(AzureDevOpsService.name);

  constructor(
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  private async resolveCredential(
    orgId: string,
  ): Promise<AzureDevOpsCredentialPayload> {
    const credential = await this.credentialService.findByType(
      orgId,
      IntegrationType.AZURE_DEVOPS,
    );
    if (!credential) {
      throw new NotFoundException("Azure DevOps credential not found");
    }
    return JSON.parse(
      this.credentialService.decrypt(credential.encryptedValue),
    ) as AzureDevOpsCredentialPayload;
  }

  /**
   * Lists recent pipeline runs from the configured Azure DevOps organization and project.
   *
   * @param orgId - Organization UUID
   */
  async listPipelines(orgId: string): Promise<AzureDevOpsPipelineRun[]> {
    const { token, organization, project } =
      await this.resolveCredential(orgId);
    const basicAuth = Buffer.from(`:${token}`).toString("base64");
    const url = `https://dev.azure.com/${organization}/${project}/_apis/build/builds?api-version=7.1`;
    let res: Response;
    try {
      res = await globalThis.fetch(url, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      this.translateHttpError(err, "AzureDevOpsService.listPipelines");
    }
    if (!res.ok) {
      this.logger.warn(`Azure DevOps API returned ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      value?: Record<string, unknown>[];
    };
    const runs = data.value ?? [];
    return runs.map((r) => {
      const def = (r.definition ?? {}) as Record<string, unknown>;
      return {
        id: r.id as number,
        name: (def.name as string) ?? (r.buildNumber as string) ?? "",
        state: (r.status as string) ?? "unknown",
        result: (r.result as string | null) ?? null,
        createdDate: (r.startTime as string) ?? (r.queueTime as string) ?? "",
        finishedDate: (r.finishTime as string | null) ?? null,
        pipeline: {
          id: (def.id as number) ?? (r.id as number),
          name: (def.name as string) ?? "",
        },
      };
    });
  }

  private translateHttpError(err: unknown, operation: string): never {
    return translateHttpError(err, operation, this.logger);
  }
}
