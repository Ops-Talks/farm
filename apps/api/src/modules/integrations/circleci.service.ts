import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import * as crypto from "crypto";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";

/**
 * Minimal shape of a CircleCI pipeline object.
 */
export interface CircleCIPipeline {
  id: string;
  project_slug: string;
  state: string;
  created_at: string;
  vcs?: {
    origin_repository_url?: string;
    branch?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Credential payload stored in a CircleCI integration credential.
 */
interface CircleCICredentialPayload {
  apiToken: string;
}

const CIRCLECI_BASE = "https://circleci.com/api/v2";

/**
 * Service for interacting with the CircleCI API.
 */
@Injectable()
export class CircleCIService {
  private readonly logger = new Logger(CircleCIService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  /**
   * Resolves the CircleCI API token for the given organization.
   *
   * @param orgId - Organization UUID
   * @returns Parsed credential payload
   * @throws NotFoundException if no CircleCI credential is configured
   */
  private async resolveToken(orgId: string): Promise<string> {
    const credential = await this.credentialService.findByType(
      orgId,
      IntegrationType.CIRCLECI,
    );
    if (!credential) {
      throw new NotFoundException(
        `No CircleCI credential configured for organization "${orgId}"`,
      );
    }
    const plain = this.credentialService.decrypt(credential.encryptedValue);
    const payload = JSON.parse(plain) as CircleCICredentialPayload;
    return payload.apiToken;
  }

  /**
   * Lists CircleCI pipelines, optionally filtered by VCS URL.
   *
   * @param orgId - Organization UUID
   * @param vcsUrl - Optional VCS repository URL to filter by
   * @returns Array of CircleCI pipeline objects
   */
  async listPipelines(
    orgId: string,
    vcsUrl?: string,
  ): Promise<CircleCIPipeline[]> {
    const token = await this.resolveToken(orgId);

    const url = `${CIRCLECI_BASE}/pipeline`;
    this.logger.debug(`CircleCI listPipelines: GET ${url}`);

    const response = await firstValueFrom(
      this.httpService.get<{ items: CircleCIPipeline[] }>(url, {
        headers: { "x-circleci-token": token },
      }),
    );

    let items = response.data.items ?? [];

    if (vcsUrl) {
      items = items.filter((p) => p.vcs?.origin_repository_url === vcsUrl);
    }

    return items;
  }

  /**
   * Triggers a new pipeline run for a project slug.
   *
   * @param orgId - Organization UUID
   * @param projectSlug - CircleCI project slug (e.g. "gh/org/repo")
   * @param branch - Optional branch name to run against
   * @returns The triggered pipeline object
   */
  async triggerPipeline(
    orgId: string,
    projectSlug: string,
    branch?: string,
  ): Promise<CircleCIPipeline> {
    const token = await this.resolveToken(orgId);

    const url = `${CIRCLECI_BASE}/project/${projectSlug}/pipeline`;
    const body: Record<string, unknown> = {};
    if (branch) body["branch"] = branch;

    this.logger.log(
      `CircleCI triggerPipeline: POST ${url} branch=${branch ?? "default"}`,
    );

    const response = await firstValueFrom(
      this.httpService.post<CircleCIPipeline>(url, body, {
        headers: { "x-circleci-token": token },
      }),
    );

    return response.data;
  }

  /**
   * Verifies a CircleCI webhook signature using HMAC-SHA256.
   *
   * @param payload - Raw webhook payload string
   * @param signature - Signature header from CircleCI (hex digest)
   * @param secret - HMAC signing secret
   * @returns True if the signature is valid
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expected, "hex"),
      );
    } catch {
      return false;
    }
  }
}
