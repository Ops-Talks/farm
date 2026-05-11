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
 * Minimal shape of a Travis CI build object.
 */
export interface TravisCIBuild {
  id: number;
  number: string;
  state: string;
  started_at: string | null;
  finished_at: string | null;
  repository?: {
    slug?: string;
    [key: string]: unknown;
  };
  branch?: {
    name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Credential payload stored in a Travis CI integration credential.
 */
interface TravisCICredentialPayload {
  apiToken: string;
}

const TRAVIS_BASE = "https://api.travis-ci.com";

/**
 * Service for interacting with the Travis CI API.
 * Uses Bearer token authentication.
 */
@Injectable()
export class TravisCIService {
  private readonly logger = new Logger(TravisCIService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  /**
   * Resolves the Travis CI API token for the given organization.
   *
   * @param orgId - Organization UUID
   * @returns API token string
   * @throws NotFoundException if no Travis CI credential is configured
   */
  private async resolveToken(orgId: string): Promise<string> {
    const credential = await this.credentialService.findByType(
      orgId,
      IntegrationType.TRAVISCI,
    );
    if (!credential) {
      throw new NotFoundException(
        `No Travis CI credential configured for organization "${orgId}"`,
      );
    }
    const plain = this.credentialService.decrypt(credential.encryptedValue);
    const payload = JSON.parse(plain) as TravisCICredentialPayload;
    return payload.apiToken;
  }

  /**
   * Returns the common headers required for Travis CI API requests.
   */
  private headers(token: string): Record<string, string> {
    return {
      Authorization: `token ${token}`,
      "Travis-API-Version": "3",
    };
  }

  /**
   * Lists Travis CI builds, optionally filtered by repository slug.
   *
   * @param orgId - Organization UUID
   * @param repoSlug - Optional repository slug (e.g. "owner/repo")
   * @returns Array of build objects
   */
  async listBuilds(orgId: string, repoSlug?: string): Promise<TravisCIBuild[]> {
    const token = await this.resolveToken(orgId);

    const url = repoSlug
      ? `${TRAVIS_BASE}/repo/${encodeURIComponent(repoSlug)}/builds`
      : `${TRAVIS_BASE}/builds`;

    this.logger.debug(`Travis CI listBuilds: GET ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ builds: TravisCIBuild[] }>(url, {
          headers: this.headers(token),
          timeout: 5000,
        }),
      );
      return response.data.builds ?? [];
    } catch (err) {
      this.translateHttpError(err, "TravisCIService.listBuilds");
    }
  }

  /**
   * Restarts a Travis CI build by id.
   *
   * @param orgId - Organization UUID
   * @param buildId - Numeric build id
   * @returns The API response payload
   */
  async restartBuild(
    orgId: string,
    buildId: string,
  ): Promise<Record<string, unknown>> {
    const token = await this.resolveToken(orgId);
    const url = `${TRAVIS_BASE}/build/${buildId}/restart`;
    this.logger.log(`Travis CI restartBuild: POST ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<Record<string, unknown>>(url, null, {
          headers: this.headers(token),
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (err) {
      this.translateHttpError(err, "TravisCIService.restartBuild");
    }
  }

  /**
   * Translates an unknown error from an HTTP call into an appropriate
   * NestJS HttpException. Always throws — never returns.
   *
   * @param err - The caught error
   * @param operation - Identifier used in log messages (e.g. "TravisCIService.listBuilds")
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
