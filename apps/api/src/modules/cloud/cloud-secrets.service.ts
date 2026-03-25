import { Injectable, Logger, Optional } from "@nestjs/common";
import { AwsService } from "./aws/aws.service";
import { GcpService } from "./gcp/gcp.service";
import { AzureService } from "./azure/azure.service";

/**
 * Parses and resolves cloud secret references from pipeline stage configuration.
 *
 * Supported ref formats:
 *   arn:aws:secretsmanager:{region}:{account}:secret:{name}  → AWS Secrets Manager
 *   gcp:projects/{project}/secrets/{name}/versions/{version} → GCP Secret Manager
 *   azure:{vaultUrl}:{secretName}                            → Azure Key Vault
 */
@Injectable()
export class CloudSecretsService {
  private readonly logger = new Logger(CloudSecretsService.name);

  /** Regex that matches AWS Secrets Manager ARNs */
  static readonly AWS_SECRET_PATTERN =
    /^arn:aws:secretsmanager:[^:]+:\d+:secret:.+$/;

  /** Regex that matches GCP Secret Manager paths */
  static readonly GCP_SECRET_PATTERN =
    /^gcp:projects\/[^/]+\/secrets\/[^/]+\/versions\/[^/]+$/;

  /** Regex that matches Azure Key Vault references (azure:{vaultUrl}:{secretName})
   *
   * The vault URL may contain colons (e.g. port: https://localhost:8443 or IPv6
   * literals). The pattern uses [^/]+ for the host segment — which allows colons
   * for port numbers — and [^:]+ for the secret name so that lastIndexOf(":")
   * always identifies the correct separator, consistent with the parsing logic.
   */
  static readonly AZURE_SECRET_PATTERN =
    /^azure:https:\/\/[^/]+(?:\/[^:]*)?:[^:]+$/;

  constructor(
    @Optional() private readonly awsService?: AwsService,
    @Optional() private readonly gcpService?: GcpService,
    @Optional() private readonly azureService?: AzureService,
  ) {}

  /**
   * Resolves a secret reference to its plain-text value.
   * The provider is auto-detected from the ref prefix.
   *
   * @param ref - Cloud secret reference string
   * @param orgId - Organization UUID
   * @returns Resolved plain-text secret value
   * @throws Error if the ref format is not recognized or the provider is unavailable
   */
  async resolve(ref: string, orgId: string): Promise<string> {
    if (CloudSecretsService.AWS_SECRET_PATTERN.test(ref)) {
      if (!this.awsService) {
        throw new Error("AWS service not available");
      }
      this.logger.debug(`Resolving AWS secret for org ${orgId}: ${ref}`);
      return this.awsService.resolveSecret(orgId, ref);
    }

    if (CloudSecretsService.GCP_SECRET_PATTERN.test(ref)) {
      if (!this.gcpService) {
        throw new Error("GCP service not available");
      }
      this.logger.debug(`Resolving GCP secret for org ${orgId}: ${ref}`);
      return this.gcpService.resolveSecret(orgId, ref);
    }

    if (CloudSecretsService.AZURE_SECRET_PATTERN.test(ref)) {
      if (!this.azureService) {
        throw new Error("Azure service not available");
      }
      this.logger.debug(`Resolving Azure secret for org ${orgId}: ${ref}`);
      // ref format: azure:{vaultUrl}:{secretName}
      const withoutPrefix = ref.slice("azure:".length);
      const vaultEnd = withoutPrefix.lastIndexOf(":");
      const vaultUrl = withoutPrefix.slice(0, vaultEnd);
      const secretName = withoutPrefix.slice(vaultEnd + 1);
      return this.azureService.resolveSecret(orgId, vaultUrl, secretName);
    }

    throw new Error(`Unsupported secret ref format: "${ref}"`);
  }

  /**
   * Determines whether the given string value looks like a cloud secret reference.
   *
   * @param value - String to test
   * @returns true if the value matches any supported secret ref pattern
   */
  isSecretRef(value: string): boolean {
    return (
      CloudSecretsService.AWS_SECRET_PATTERN.test(value) ||
      CloudSecretsService.GCP_SECRET_PATTERN.test(value) ||
      CloudSecretsService.AZURE_SECRET_PATTERN.test(value)
    );
  }

  /**
   * Scans a configuration object and resolves any values that are secret refs.
   * Returns a shallow copy of the config with resolved values.
   *
   * @param config - Stage configuration object
   * @param orgId - Organization UUID
   * @returns Config object with secret refs replaced by their resolved values
   */
  async resolveConfigSecrets(
    config: Record<string, unknown>,
    orgId: string,
  ): Promise<Record<string, unknown>> {
    const resolved: Record<string, unknown> = { ...config };

    await Promise.all(
      Object.entries(resolved).map(async ([key, value]) => {
        if (typeof value === "string" && this.isSecretRef(value)) {
          try {
            resolved[key] = await this.resolve(value, orgId);
          } catch (err) {
            this.logger.warn(
              `Failed to resolve secret ref "${value}" for org ${orgId}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }),
    );

    return resolved;
  }
}
