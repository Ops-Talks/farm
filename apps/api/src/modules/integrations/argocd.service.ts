import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";
import { translateHttpError } from "./http-error";

/**
 * Minimal shape of an ArgoCD application object returned by the ArgoCD API.
 */
export interface ArgoCDApplication {
  name: string;
  namespace?: string;
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Credential payload stored in an ArgoCD integration credential.
 */
interface ArgoCDCredentialPayload {
  url: string;
  token: string;
}

/**
 * Service for interacting with the ArgoCD API.
 * Credentials are resolved from IntegrationCredentialService and
 * decrypted on demand.
 */
@Injectable()
export class ArgoCDService {
  private readonly logger = new Logger(ArgoCDService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly credentialService: IntegrationCredentialService,
    private readonly cb: CircuitBreakerService,
  ) {}

  /**
   * Resolves and decrypts the ArgoCD credential payload for an organization.
   *
   * @param orgId - Organization UUID
   * @returns Parsed credential payload
   * @throws NotFoundException if no ArgoCD credential is configured
   */
  private async resolveCredential(
    orgId: string,
  ): Promise<ArgoCDCredentialPayload> {
    const credential = await this.credentialService.findByType(
      orgId,
      IntegrationType.ARGOCD,
    );
    if (!credential) {
      throw new NotFoundException(
        `No ArgoCD credential configured for organization "${orgId}"`,
      );
    }
    const plain = this.credentialService.decrypt(credential.encryptedValue);
    return JSON.parse(plain) as ArgoCDCredentialPayload;
  }

  /**
   * Lists all ArgoCD applications for the given organization.
   *
   * @param orgId - Organization UUID
   * @returns Array of ArgoCD application objects, or empty array on missing config
   */
  async listApplications(orgId: string): Promise<ArgoCDApplication[]> {
    let payload: ArgoCDCredentialPayload;
    try {
      payload = await this.resolveCredential(orgId);
    } catch {
      this.logger.warn(
        `ArgoCD credential not configured for org ${orgId}, returning empty list`,
      );
      return [];
    }

    const url = `${payload.url}/api/v1/applications`;
    this.logger.debug(`ArgoCD listApplications: GET ${url}`);

    try {
      const response = await this.cb.fire("argocd", () =>
        firstValueFrom(
          this.httpService.get<{ items: ArgoCDApplication[] }>(url, {
            headers: { Authorization: `Bearer ${payload.token}` },
            timeout: 5000,
          }),
        ),
      );
      return response.data.items ?? [];
    } catch (err) {
      this.translateHttpError(err, "ArgoCDService.listApplications");
    }
  }

  /**
   * Returns a single ArgoCD application by name.
   *
   * @param orgId - Organization UUID
   * @param appName - ArgoCD application name
   * @returns The ArgoCD application object
   * @throws NotFoundException if no ArgoCD credential is configured
   */
  async getApplication(
    orgId: string,
    appName: string,
  ): Promise<ArgoCDApplication> {
    const payload = await this.resolveCredential(orgId);
    const url = `${payload.url}/api/v1/applications/${appName}`;
    this.logger.debug(`ArgoCD getApplication: GET ${url}`);

    try {
      const response = await this.cb.fire("argocd", () =>
        firstValueFrom(
          this.httpService.get<ArgoCDApplication>(url, {
            headers: { Authorization: `Bearer ${payload.token}` },
            timeout: 5000,
          }),
        ),
      );
      return response.data;
    } catch (err) {
      this.translateHttpError(err, "ArgoCDService.getApplication");
    }
  }

  /**
   * Triggers a sync for the specified ArgoCD application.
   *
   * @param orgId - Organization UUID
   * @param appName - ArgoCD application name
   * @returns The sync response from ArgoCD
   * @throws NotFoundException if no ArgoCD credential is configured
   */
  async syncApplication(
    orgId: string,
    appName: string,
  ): Promise<Record<string, unknown>> {
    const payload = await this.resolveCredential(orgId);
    const url = `${payload.url}/api/v1/applications/${appName}/sync`;
    this.logger.log(`ArgoCD syncApplication: POST ${url}`);

    try {
      const response = await this.cb.fire("argocd", () =>
        firstValueFrom(
          this.httpService.post<Record<string, unknown>>(
            url,
            {},
            {
              headers: { Authorization: `Bearer ${payload.token}` },
              timeout: 5000,
            },
          ),
        ),
      );
      return response.data;
    } catch (err) {
      this.translateHttpError(err, "ArgoCDService.syncApplication");
    }
  }

  private translateHttpError(err: unknown, operation: string): never {
    return translateHttpError(err, operation, this.logger);
  }
}
