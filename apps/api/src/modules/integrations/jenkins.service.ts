import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { isAxiosError } from "axios";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";

/**
 * Minimal shape of a Jenkins job object.
 */
export interface JenkinsJob {
  name: string;
  url: string;
  color?: string;
  lastBuild?: {
    number: number;
    result: string;
    timestamp: number;
    duration: number;
  };
}

/**
 * Minimal shape of a Jenkins build object.
 */
export interface JenkinsBuild {
  number: number;
  result: string;
  timestamp: number;
  duration: number;
  url?: string;
}

/**
 * Credential payload stored in a Jenkins integration credential.
 */
interface JenkinsCredentialPayload {
  url: string;
  user: string;
  apiToken: string;
}

/**
 * Service for interacting with the Jenkins API.
 * Uses HTTP Basic authentication (user:apiToken).
 * Supports crumb-based CSRF protection for POST endpoints.
 */
@Injectable()
export class JenkinsService {
  private readonly logger = new Logger(JenkinsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  /**
   * Resolves and decrypts the Jenkins credential payload for an organization.
   *
   * @param orgId - Organization UUID
   * @returns Parsed Jenkins credential payload
   * @throws NotFoundException if no Jenkins credential is configured
   */
  private async resolveCredential(
    orgId: string,
  ): Promise<JenkinsCredentialPayload> {
    const credential = await this.credentialService.findByType(
      orgId,
      IntegrationType.JENKINS,
    );
    if (!credential) {
      throw new NotFoundException(
        `No Jenkins credential configured for organization "${orgId}"`,
      );
    }
    const plain = this.credentialService.decrypt(credential.encryptedValue);
    return JSON.parse(plain) as JenkinsCredentialPayload;
  }

  /**
   * Returns the Basic auth header value for the given credential.
   */
  private basicAuth(cred: JenkinsCredentialPayload): string {
    return (
      "Basic " + Buffer.from(`${cred.user}:${cred.apiToken}`).toString("base64")
    );
  }

  /**
   * Fetches the Jenkins CSRF crumb token required for POST requests.
   *
   * @param cred - Jenkins credential payload
   * @returns Object containing crumb field name and value
   */
  private async fetchCrumb(
    cred: JenkinsCredentialPayload,
  ): Promise<{ crumbRequestField: string; crumb: string }> {
    const url = `${cred.url}/crumbIssuer/api/json`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ crumbRequestField: string; crumb: string }>(
          url,
          {
            headers: { Authorization: this.basicAuth(cred) },
            timeout: 5000,
          },
        ),
      );
      return response.data;
    } catch (err) {
      this.translateHttpError(err, "JenkinsService.fetchCrumb");
    }
  }

  /**
   * Lists all Jenkins jobs with their last build information.
   *
   * @param orgId - Organization UUID
   * @returns Array of Jenkins job objects
   */
  async listJobs(orgId: string): Promise<JenkinsJob[]> {
    const cred = await this.resolveCredential(orgId);
    const url = `${cred.url}/api/json?tree=jobs[name,url,color,lastBuild[number,result,timestamp,duration]]`;
    this.logger.debug(`Jenkins listJobs: GET ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ jobs: JenkinsJob[] }>(url, {
          headers: { Authorization: this.basicAuth(cred) },
          timeout: 5000,
        }),
      );
      return response.data.jobs ?? [];
    } catch (err) {
      this.translateHttpError(err, "JenkinsService.listJobs");
    }
  }

  /**
   * Returns the build history for a specific Jenkins job.
   *
   * @param orgId - Organization UUID
   * @param jobName - Jenkins job name
   * @param limit - Maximum number of builds to return (default 10)
   * @returns Array of build objects
   */
  async getBuildHistory(
    orgId: string,
    jobName: string,
    limit = 10,
  ): Promise<JenkinsBuild[]> {
    const cred = await this.resolveCredential(orgId);
    const tree = `builds[number,result,timestamp,duration,url]{0,${limit}}`;
    const url = `${cred.url}/job/${encodeURIComponent(jobName)}/api/json?tree=${tree}`;
    this.logger.debug(`Jenkins getBuildHistory: GET ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ builds: JenkinsBuild[] }>(url, {
          headers: { Authorization: this.basicAuth(cred) },
          timeout: 5000,
        }),
      );
      return response.data.builds ?? [];
    } catch (err) {
      this.translateHttpError(err, "JenkinsService.getBuildHistory");
    }
  }

  /**
   * Triggers a new build for a Jenkins job.
   * Fetches the CSRF crumb before issuing the POST.
   *
   * @param orgId - Organization UUID
   * @param jobName - Jenkins job name
   * @returns Empty object on success (Jenkins returns 201 with empty body)
   */
  async triggerBuild(orgId: string, jobName: string): Promise<void> {
    const cred = await this.resolveCredential(orgId);

    const crumb = await this.fetchCrumb(cred);
    const url = `${cred.url}/job/${encodeURIComponent(jobName)}/build`;
    this.logger.log(`Jenkins triggerBuild: POST ${url}`);

    try {
      await firstValueFrom(
        this.httpService.post(url, null, {
          headers: {
            Authorization: this.basicAuth(cred),
            [crumb.crumbRequestField]: crumb.crumb,
          },
          timeout: 5000,
        }),
      );
    } catch (err) {
      this.translateHttpError(err, "JenkinsService.triggerBuild");
    }
  }

  /**
   * Translates an unknown error from an HTTP call into an appropriate
   * NestJS HttpException. Always throws — never returns.
   *
   * @param err - The caught error
   * @param operation - Identifier used in log messages (e.g. "JenkinsService.listJobs")
   */
  private translateHttpError(err: unknown, operation: string): never {
    if (isAxiosError(err)) {
      if (!err.response) {
        this.logger.error(`${operation}: service unreachable`, {
          code: err.code,
          url: err.config?.url,
        });
        throw new ServiceUnavailableException(
          `${operation}: integration service is currently unreachable`,
        );
      }
      const status = err.response.status;
      this.logger.error(`${operation}: upstream error`, {
        status,
        url: err.config?.url,
      });
      if (status === 401 || status === 403) {
        throw new UnauthorizedException(
          `${operation}: integration credentials are invalid or expired`,
        );
      }
      if (status === 404) {
        throw new NotFoundException(`${operation}: resource not found`);
      }
      throw new BadGatewayException(
        `${operation}: integration service returned status ${status}`,
      );
    }
    this.logger.error(`${operation}: unexpected error`, {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new InternalServerErrorException(`${operation}: unexpected error`);
  }
}
