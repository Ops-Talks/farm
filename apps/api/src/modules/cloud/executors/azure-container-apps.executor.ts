import { Injectable, Logger, Optional } from "@nestjs/common";
import { AzureService } from "../azure/azure.service";

/**
 * Configuration for an Azure Container Apps deploy stage in a pipeline.
 */
export interface AzureContainerAppsDeployConfig {
  /** Executor engine identifier; must equal "azure-container-apps" to route to this executor */
  engine: "azure-container-apps";
  /** Organization UUID used to resolve Azure credentials */
  orgId: string;
  /** Azure resource group name */
  resourceGroup: string;
  /** Container App name */
  appName: string;
  /** Container image URI to deploy */
  image: string;
}

/**
 * Pipeline stage executor for deploying to Azure Container Apps.
 * Implements the execute(config, logFn) pattern used by pipeline processors.
 */
@Injectable()
export class AzureContainerAppsExecutor {
  private readonly logger = new Logger(AzureContainerAppsExecutor.name);

  constructor(@Optional() private readonly azureService?: AzureService) {}

  /**
   * Executes a Container Apps deployment.
   *
   * @param config - Container Apps deployment configuration
   * @param logFn - Callback invoked with each log line
   * @returns Execution result with success flag and output
   */
  async execute(
    config: AzureContainerAppsDeployConfig,
    logFn: (msg: string) => void,
  ): Promise<{ success: boolean; output: string }> {
    if (!this.azureService) {
      const msg =
        "Azure service not available — skipping Container Apps deployment";
      this.logger.warn(msg);
      logFn(msg);
      return { success: false, output: msg };
    }

    logFn(
      `Deploying image "${config.image}" to Container App "${config.appName}" in resource group "${config.resourceGroup}"`,
    );
    this.logger.log(
      `Container Apps deploy: appName=${config.appName} resourceGroup=${config.resourceGroup} image=${config.image}`,
    );

    const result = await this.azureService.deployToContainerApps(config.orgId, {
      resourceGroup: config.resourceGroup,
      appName: config.appName,
      image: config.image,
    });

    logFn(result.output);
    return result;
  }
}
