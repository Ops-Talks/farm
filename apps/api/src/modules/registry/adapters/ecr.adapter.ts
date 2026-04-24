import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ECRClient,
  DescribeRepositoriesCommand,
  DescribeImagesCommand,
  DescribeImageScanFindingsCommand,
  ImageDetail,
} from "@aws-sdk/client-ecr";
import { RegistryType } from "../enums/registry-type.enum";
import {
  IRegistryAdapter,
  RepositoryDto,
  TagDto,
  ManifestDto,
  ScanResultDto,
  VulnerabilityDto,
} from "../interfaces/registry-adapter.interface";

/**
 * Parsed ECR credentials from the registry.credentials config value.
 */
interface EcrCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

/**
 * Adapter for Amazon Elastic Container Registry (ECR).
 *
 * Credentials are read from the registry.credentials config key as a JSON
 * string containing { accessKeyId, secretAccessKey, region }.
 * The registry.url config key is used as the optional accountId.
 */
export class EcrAdapter implements IRegistryAdapter {
  readonly type = RegistryType.ECR;

  private readonly logger = new Logger(EcrAdapter.name);
  private readonly client: ECRClient;
  private readonly accountId: string;

  constructor(private readonly config: ConfigService) {
    const rawCredentials = config.get<string>("registry.credentials") ?? "";
    const credentials: EcrCredentials = rawCredentials
      ? (JSON.parse(rawCredentials) as EcrCredentials)
      : { accessKeyId: "", secretAccessKey: "", region: "us-east-1" };

    this.accountId = config.get<string>("registry.url") ?? "";

    this.client = new ECRClient({
      region: credentials.region || "us-east-1",
      credentials: credentials.accessKeyId
        ? {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
          }
        : undefined,
    });
  }

  /**
   * Lists all ECR repositories, following pagination via nextToken.
   */
  async listRepositories(): Promise<RepositoryDto[]> {
    const repositories: RepositoryDto[] = [];
    let nextToken: string | undefined;

    do {
      const response = await this.client.send(
        new DescribeRepositoriesCommand({
          registryId: this.accountId || undefined,
          nextToken,
        }),
      );

      for (const repo of response.repositories ?? []) {
        repositories.push({
          name: repo.repositoryName ?? "",
          uri: repo.repositoryUri ?? "",
        });
      }

      nextToken = response.nextToken;
    } while (nextToken);

    this.logger.log(`Fetched ${repositories.length} repositories from ECR`);
    return repositories;
  }

  /**
   * Lists all image tags in a given ECR repository.
   */
  async listTags(repo: string): Promise<TagDto[]> {
    const response = await this.client.send(
      new DescribeImagesCommand({
        repositoryName: repo,
        registryId: this.accountId || undefined,
      }),
    );

    const tags: TagDto[] = [];
    for (const detail of response.imageDetails ?? []) {
      tags.push(this.imageDetailToTagDto(detail));
    }

    return tags;
  }

  /**
   * Returns the manifest for a specific image tag in an ECR repository.
   */
  async getManifest(repo: string, tag: string): Promise<ManifestDto> {
    const response = await this.client.send(
      new DescribeImagesCommand({
        repositoryName: repo,
        registryId: this.accountId || undefined,
        imageIds: [{ imageTag: tag }],
      }),
    );

    const detail = (response.imageDetails ?? [])[0];
    if (!detail) {
      throw new Error(`Image ${repo}:${tag} not found in ECR`);
    }

    return {
      digest: detail.imageDigest ?? "",
      mediaType:
        detail.artifactMediaType ??
        "application/vnd.oci.image.manifest.v1+json",
      sizeBytes: detail.imageSizeInBytes ?? undefined,
      pushedAt: detail.imagePushedAt ?? undefined,
      tags: detail.imageTags ?? [],
    };
  }

  /**
   * Returns vulnerability scan results for a specific image tag in an ECR repository.
   * Returns UNSUPPORTED when the image or registry is not found.
   * Returns PENDING when the scan is still in progress.
   */
  async getScanResults(repo: string, tag: string): Promise<ScanResultDto> {
    try {
      const response = await this.client.send(
        new DescribeImageScanFindingsCommand({
          repositoryName: repo,
          registryId: this.accountId || undefined,
          imageId: { imageTag: tag },
        }),
      );

      const scanStatus = response.imageScanStatus?.status ?? "";

      if (scanStatus === "IN_PROGRESS") {
        return { status: "PENDING", vulnerabilities: [] };
      }

      if (scanStatus === "FAILED") {
        return { status: "FAILED", vulnerabilities: [] };
      }

      const findings = response.imageScanFindings?.findings ?? [];
      const vulnerabilities: VulnerabilityDto[] = findings.map((f) => ({
        cveId: f.name ?? "",
        severity: f.severity ?? "UNDEFINED",
        packageName:
          f.attributes?.find((a) => a.key === "package_name")?.value ?? "",
        installedVersion:
          f.attributes?.find((a) => a.key === "package_version")?.value ??
          undefined,
        fixedVersion: undefined,
        description: f.description ?? undefined,
      }));

      return { status: "COMPLETE", vulnerabilities };
    } catch (err: unknown) {
      const errorName = (err as { name?: string }).name ?? "";
      if (
        errorName === "RegistryNotFoundException" ||
        errorName === "ImageNotFoundException" ||
        errorName === "ScanNotFoundException"
      ) {
        return { status: "UNSUPPORTED", vulnerabilities: [] };
      }
      this.logger.error(
        `ECR scan results fetch failed for ${repo}:${tag}: ${String(err)}`,
      );
      throw err;
    }
  }

  /**
   * Maps an ECR ImageDetail record to a TagDto.
   */
  private imageDetailToTagDto(detail: ImageDetail): TagDto {
    return {
      tag: (detail.imageTags ?? [])[0] ?? "",
      digest: detail.imageDigest ?? undefined,
      pushedAt: detail.imagePushedAt ?? undefined,
      sizeBytes: detail.imageSizeInBytes ?? undefined,
    };
  }
}
