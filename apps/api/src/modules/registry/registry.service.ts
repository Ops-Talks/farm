import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { REGISTRY_ADAPTER } from './registry.constants';
import {
  IRegistryAdapter,
  RepositoryDto,
  TagDto,
  ManifestDto,
  ScanResultDto,
  HarborReplicationPolicy,
} from './interfaces/registry-adapter.interface';
import { RegistryType } from './enums/registry-type.enum';

/**
 * Extracts the adapter-specific repository identifier from a full image
 * reference (e.g. `123456.dkr.ecr.us-east-1.amazonaws.com/my-service`).
 *
 * - **ECR**: returns the repository name after the host (e.g. `my-service`)
 * - **Docker Hub**: returns `namespace/repo` or `library/repo`
 * - **Harbor**: returns `project/repo` path after the host
 * - **GCR / Artifact Registry**: returns the full reference as-is (adapters
 *   expect a resource name or the raw image reference)
 * - Fallback: returns the input unchanged
 */
function normalizeImageForAdapter(
  image: string,
  registryType: RegistryType | string,
): string {
  switch (registryType) {
    case RegistryType.ECR: {
      // ECR images: <account>.dkr.ecr.<region>.amazonaws.com/<repo>[:<tag>]
      const slashIdx = image.indexOf('/');
      if (slashIdx >= 0) {
        const host = image.substring(0, slashIdx);
        if (host.endsWith('.amazonaws.com')) {
          return image.substring(slashIdx + 1).split(':')[0];
        }
      }
      return image.split(':')[0];
    }
    case RegistryType.DOCKER_HUB: {
      // Docker Hub: docker.io/<ns>/<repo> or <ns>/<repo> or <repo>
      let path = image;
      // Strip known Docker Hub hosts
      for (const host of ['docker.io/', 'index.docker.io/', 'registry-1.docker.io/']) {
        if (path.startsWith(host)) {
          path = path.substring(host.length);
          break;
        }
      }
      // Strip tag/digest
      path = path.split(':')[0].split('@')[0];
      // Default namespace for official images
      if (!path.includes('/')) {
        path = `library/${path}`;
      }
      return path;
    }
    case RegistryType.HARBOR: {
      // Harbor: <host>/<project>/<repo>[:<tag>]
      let path = image;
      // Strip protocol prefix if present
      path = path.replace(/^https?:\/\//, '');
      // If there's a host portion (contains dots or port), strip it
      const parts = path.split('/');
      if (parts.length > 2 && (parts[0].includes('.') || parts[0].includes(':'))) {
        path = parts.slice(1).join('/');
      }
      // Strip tag/digest
      path = path.split(':')[0].split('@')[0];
      return path;
    }
    default:
      // GCR and unknown: return as-is (strip tag/digest only)
      return image.split(':')[0].split('@')[0];
  }
}

/**
 * Service that delegates registry operations to the configured adapter.
 * Throws ServiceUnavailableException when no adapter is configured.
 */
@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name);

  constructor(
    @Inject(REGISTRY_ADAPTER)
    private readonly adapter: IRegistryAdapter | null,
  ) {}

  /**
   * Returns the configured adapter type, or null if no adapter is set.
   */
  get adapterType(): RegistryType | null {
    return this.adapter?.type ?? null;
  }

  /**
   * Asserts that an adapter is configured before delegating a call.
   */
  private getAdapter(): IRegistryAdapter {
    if (!this.adapter) {
      throw new ServiceUnavailableException('Registry adapter not configured');
    }
    return this.adapter;
  }

  /**
   * Normalizes a full image reference to the adapter-specific repository
   * identifier based on the currently configured registry type.
   *
   * @param image - Full image reference (e.g. `123456.dkr.ecr.../my-service:latest`)
   * @returns Normalized repository identifier for the active adapter
   */
  normalizeImage(image: string): string {
    const adapter = this.getAdapter();
    return normalizeImageForAdapter(image, adapter.type);
  }

  /**
   * Lists all repositories available in the configured registry.
   */
  async listRepositories(): Promise<RepositoryDto[]> {
    return this.getAdapter().listRepositories();
  }

  /**
   * Lists all tags for the given repository.
   * Normalizes the image reference for the active adapter before delegating.
   *
   * @param repo - Repository name, URI, or full image reference
   */
  async listTags(repo: string): Promise<TagDto[]> {
    const adapter = this.getAdapter();
    const normalized = normalizeImageForAdapter(repo, adapter.type);
    return adapter.listTags(normalized);
  }

  /**
   * Returns the manifest for a specific image tag.
   *
   * @param repo - Repository name or URI
   * @param tag  - Image tag
   */
  async getManifest(repo: string, tag: string): Promise<ManifestDto> {
    return this.getAdapter().getManifest(repo, tag);
  }

  /**
   * Returns vulnerability scan results for a specific image tag.
   * Normalizes the image reference for the active adapter before delegating.
   *
   * @param repo - Repository name, URI, or full image reference
   * @param tag  - Image tag
   */
  async getScanResults(repo: string, tag: string): Promise<ScanResultDto> {
    const adapter = this.getAdapter();
    const normalized = normalizeImageForAdapter(repo, adapter.type);
    return adapter.getScanResults(normalized, tag);
  }

  /**
   * Lists Harbor replication policies. Returns empty array for non-Harbor adapters.
   */
  async listHarborReplications(): Promise<HarborReplicationPolicy[]> {
    const adapter = this.adapter;
    if (!adapter || adapter.type !== RegistryType.HARBOR) {
      return [];
    }
    if (typeof adapter.listReplicationPolicies !== 'function') {
      return [];
    }
    return adapter.listReplicationPolicies();
  }
}
