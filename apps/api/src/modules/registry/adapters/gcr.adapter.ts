import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleAuth } from "google-auth-library";
import { RegistryType } from "../enums/registry-type.enum";
import {
  IRegistryAdapter,
  RepositoryDto,
  TagDto,
  ManifestDto,
  ScanResultDto,
} from "../interfaces/registry-adapter.interface";

/**
 * Parsed GCP service account credentials.
 */
interface GcpCredentials {
  project_id: string;
  [key: string]: unknown;
}

/**
 * Shape of a single repository record from the Artifact Registry REST API.
 */
interface ArtifactRepository {
  name: string;
  format?: string;
  description?: string;
}

/**
 * Shape of the repositories list response from the Artifact Registry REST API.
 */
interface ArtifactRepositoriesResponse {
  repositories?: ArtifactRepository[];
  nextPageToken?: string;
}

/**
 * Shape of a single tag record from the Artifact Registry REST API.
 */
interface ArtifactTag {
  name: string;
  version?: string;
}

/**
 * Shape of the tags list response from the Artifact Registry REST API.
 */
interface ArtifactTagsResponse {
  tags?: ArtifactTag[];
}

/**
 * Shape of a version record from the Artifact Registry REST API.
 */
interface ArtifactVersion {
  name: string;
  description?: string;
  createTime?: string;
  metadata?: { mediaType?: string };
}

/**
 * Adapter for Google Cloud Artifact Registry.
 *
 * Uses the Artifact Registry REST API authenticated via a GCP service account
 * JSON key stored in the registry.credentials config value.
 * The registry.url config key is used as the GCP location (e.g. us-central1).
 */
export class GcrAdapter implements IRegistryAdapter {
  readonly type = RegistryType.GCR;

  private readonly logger = new Logger(GcrAdapter.name);
  private readonly parsedCredentials: Record<string, unknown> | undefined;
  private readonly location: string;
  private readonly projectId: string;
  private readonly baseUrl = "https://artifactregistry.googleapis.com/v1";

  constructor(private readonly config: ConfigService) {
    const credentialsJson = config.get<string>("registry.credentials") ?? "";
    this.location = config.get<string>("registry.url") ?? "us-central1";

    let parsed: GcpCredentials = { project_id: "" };
    if (credentialsJson) {
      try {
        parsed = JSON.parse(credentialsJson) as GcpCredentials;
        this.parsedCredentials = parsed as unknown as Record<string, unknown>;
      } catch {
        this.logger.error("Failed to parse GCP credentials JSON");
      }
    }
    this.projectId = parsed.project_id ?? "";
  }

  /**
   * Retrieves a Bearer token from Google using the service account credentials.
   */
  private async getAccessToken(): Promise<string> {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      credentials: this.parsedCredentials,
    });
    const token = await auth.getAccessToken();
    return token ?? "";
  }

  /**
   * Performs an authenticated GET request against the Artifact Registry API.
   */
  private async fetchJson<T>(url: string): Promise<T> {
    const token = await this.getAccessToken();
    const response = await globalThis.fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Artifact Registry request failed: HTTP ${response.status} ${url}`,
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Lists all Artifact Registry repositories for the configured project and location.
   */
  async listRepositories(): Promise<RepositoryDto[]> {
    const url = `${this.baseUrl}/projects/${this.projectId}/locations/${this.location}/repositories`;
    const data = await this.fetchJson<ArtifactRepositoriesResponse>(url);

    const repositories: RepositoryDto[] = (data.repositories ?? []).map(
      (r) => ({
        name: r.name.split("/").pop() ?? r.name,
        uri: r.name,
        description: r.description ?? undefined,
      }),
    );

    this.logger.log(`Fetched ${repositories.length} repositories from GCR`);
    return repositories;
  }

  /**
   * Lists all tags for a given repository resource name.
   */
  async listTags(repo: string): Promise<TagDto[]> {
    const url = `${this.baseUrl}/${repo}/packages/-/tags`;
    const data = await this.fetchJson<ArtifactTagsResponse>(url);

    return (data.tags ?? []).map((t) => ({
      tag: t.name.split("/").pop() ?? t.name,
      digest: t.version ?? undefined,
    }));
  }

  /**
   * Returns the manifest (version) for a specific tag in a repository.
   */
  async getManifest(repo: string, tag: string): Promise<ManifestDto> {
    const url = `${this.baseUrl}/${repo}/packages/-/versions/${tag}`;
    const data = await this.fetchJson<ArtifactVersion>(url);

    return {
      digest: data.name,
      mediaType:
        data.metadata?.mediaType ??
        "application/vnd.oci.image.manifest.v1+json",
      pushedAt: data.createTime ? new Date(data.createTime) : undefined,
      tags: [tag],
    };
  }

  /**
   * Artifact Registry does not provide native vulnerability scan results.
   * Always returns UNSUPPORTED.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getScanResults(_repo: string, _tag: string): Promise<ScanResultDto> {
    return Promise.resolve({ status: "UNSUPPORTED", vulnerabilities: [] });
  }
}
