import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistryType } from '../enums/registry-type.enum';
import {
  IRegistryAdapter,
  RepositoryDto,
  TagDto,
  ManifestDto,
  ScanResultDto,
} from '../interfaces/registry-adapter.interface';

/**
 * Parsed Docker Hub credentials.
 */
interface DockerHubCredentials {
  username: string;
  password: string;
}

/**
 * Shape of a single repository record from the Docker Hub API.
 */
interface DockerHubRepository {
  name: string;
  namespace: string;
  description?: string;
  pull_count?: number;
}

/**
 * Shape of the Docker Hub repositories list response.
 */
interface DockerHubRepositoriesResponse {
  results: DockerHubRepository[];
  next?: string | null;
}

/**
 * Shape of a single tag record from the Docker Hub API.
 */
interface DockerHubTag {
  name: string;
  digest?: string;
  last_pushed?: string;
  full_size?: number;
}

/**
 * Shape of the Docker Hub tags list response.
 */
interface DockerHubTagsResponse {
  results: DockerHubTag[];
  next?: string | null;
}

/**
 * Shape of a single tag detail from the Docker Hub API.
 */
interface DockerHubTagDetail {
  name: string;
  digest?: string;
  last_pushed?: string;
  full_size?: number;
  images?: Array<{ digest?: string; os?: string; architecture?: string }>;
}

/**
 * Shape of the Docker Hub login response.
 */
interface DockerHubLoginResponse {
  token: string;
}

/**
 * Adapter for Docker Hub (hub.docker.com).
 *
 * Credentials are read from the registry.credentials config key as a JSON
 * string containing { username, password }.
 * The registry.url config key is an optional base URL override; defaults to
 * https://hub.docker.com.
 *
 * The auth token is cached in memory and refreshed automatically on 401.
 */
export class DockerHubAdapter implements IRegistryAdapter {
  readonly type = RegistryType.DOCKER_HUB;

  private readonly logger = new Logger(DockerHubAdapter.name);
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private authToken: string | null = null;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      config.get<string>('registry.url') || 'https://hub.docker.com';

    const rawCredentials = config.get<string>('registry.credentials') ?? '';
    const credentials: DockerHubCredentials = rawCredentials
      ? (JSON.parse(rawCredentials) as DockerHubCredentials)
      : { username: '', password: '' };

    this.username = credentials.username;
    this.password = credentials.password;
  }

  /**
   * Authenticates with Docker Hub and caches the token.
   */
  private async authenticate(): Promise<void> {
    const loginUrl = `${this.baseUrl.replace(/\/+$/, '')}/v2/users/login`;
    const response = await globalThis.fetch(
      loginUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password }),
      },
    );

    if (!response.ok) {
      throw new Error(`Docker Hub authentication failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as DockerHubLoginResponse;
    this.authToken = data.token;
  }

  /**
   * Builds Authorization header using the cached token.
   */
  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `JWT ${this.authToken ?? ''}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Performs a GET request, refreshing the token once on 401.
   */
  private async fetchJson<T>(url: string): Promise<T> {
    if (!this.authToken) {
      await this.authenticate();
    }

    let response = await globalThis.fetch(url, { headers: this.buildHeaders() });

    if (response.status === 401) {
      this.authToken = null;
      await this.authenticate();
      response = await globalThis.fetch(url, { headers: this.buildHeaders() });
    }

    if (!response.ok) {
      throw new Error(`Docker Hub request failed: HTTP ${response.status} ${url}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Lists all repositories for the authenticated Docker Hub user.
   */
  async listRepositories(): Promise<RepositoryDto[]> {
    const url = `${this.baseUrl}/v2/repositories/${this.username}/?page_size=100`;
    const data = await this.fetchJson<DockerHubRepositoriesResponse>(url);

    const repositories: RepositoryDto[] = (data.results ?? []).map((r) => ({
      name: r.name,
      uri: `${r.namespace}/${r.name}`,
      description: r.description ?? undefined,
    }));

    this.logger.log(`Fetched ${repositories.length} repositories from Docker Hub`);
    return repositories;
  }

  /**
   * Lists all tags for a given Docker Hub repository (namespace/name).
   */
  async listTags(repo: string): Promise<TagDto[]> {
    const url = `${this.baseUrl}/v2/repositories/${repo}/tags/?page_size=100`;
    const data = await this.fetchJson<DockerHubTagsResponse>(url);

    return (data.results ?? []).map((t) => ({
      tag: t.name,
      digest: t.digest ?? undefined,
      pushedAt: t.last_pushed ? new Date(t.last_pushed) : undefined,
      sizeBytes: t.full_size ?? undefined,
    }));
  }

  /**
   * Returns the manifest for a specific tag in a Docker Hub repository.
   */
  async getManifest(repo: string, tag: string): Promise<ManifestDto> {
    const url = `${this.baseUrl}/v2/repositories/${repo}/tags/${tag}`;
    const data = await this.fetchJson<DockerHubTagDetail>(url);

    return {
      digest: data.digest ?? data.images?.[0]?.digest ?? '',
      mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
      sizeBytes: data.full_size ?? undefined,
      pushedAt: data.last_pushed ? new Date(data.last_pushed) : undefined,
      tags: [data.name],
    };
  }

  /**
   * Docker Hub does not provide native vulnerability scan results.
   * Always returns UNSUPPORTED.
   */
  async getScanResults(_repo: string, _tag: string): Promise<ScanResultDto> {
    return { status: 'UNSUPPORTED', vulnerabilities: [] };
  }
}
