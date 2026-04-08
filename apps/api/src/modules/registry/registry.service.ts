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
   * Asserts that an adapter is configured before delegating a call.
   */
  private getAdapter(): IRegistryAdapter {
    if (!this.adapter) {
      throw new ServiceUnavailableException('Registry adapter not configured');
    }
    return this.adapter;
  }

  /**
   * Lists all repositories available in the configured registry.
   */
  async listRepositories(): Promise<RepositoryDto[]> {
    return this.getAdapter().listRepositories();
  }

  /**
   * Lists all tags for the given repository.
   *
   * @param repo - Repository name or URI
   */
  async listTags(repo: string): Promise<TagDto[]> {
    return this.getAdapter().listTags(repo);
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
   *
   * @param repo - Repository name or URI
   * @param tag  - Image tag
   */
  async getScanResults(repo: string, tag: string): Promise<ScanResultDto> {
    return this.getAdapter().getScanResults(repo, tag);
  }

  /**
   * Lists Harbor replication policies. Returns empty array for non-Harbor adapters.
   */
  async listHarborReplications(): Promise<HarborReplicationPolicy[]> {
    const adapter = this.adapter;
    if (!adapter || adapter.type !== RegistryType.HARBOR) {
      return [];
    }
    // Cast: we know it is HarborAdapter which exposes listReplicationPolicies
    const harborAdapter = adapter as unknown as {
      listReplicationPolicies(): Promise<HarborReplicationPolicy[]>;
    };
    return harborAdapter.listReplicationPolicies();
  }
}
