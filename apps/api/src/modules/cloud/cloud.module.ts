import { Module } from "@nestjs/common";
import { AwsService } from "./aws/aws.service";
import { GcpService } from "./gcp/gcp.service";
import { AzureService } from "./azure/azure.service";
import { CloudResourceService } from "./cloud-resource.service";
import { CloudCostService } from "./cloud-cost.service";
import { CloudSecretsService } from "./cloud-secrets.service";
import { CloudResourceController } from "./cloud-resource.controller";
import { AwsEcsExecutor } from "./executors/aws-ecs.executor";
import { AwsLambdaExecutor } from "./executors/aws-lambda.executor";
import { GcpCloudRunExecutor } from "./executors/gcp-cloud-run.executor";
import { AzureContainerAppsExecutor } from "./executors/azure-container-apps.executor";
import { IntegrationsModule } from "../integrations/integrations.module";

/**
 * Feature module for cloud provider integrations.
 * Provides resource discovery, cost reporting, secret resolution, and
 * pipeline executors for AWS, GCP, and Azure.
 *
 * All provider services gracefully degrade when credentials are not
 * configured for an organization.
 */
@Module({
  imports: [IntegrationsModule],
  controllers: [CloudResourceController],
  providers: [
    AwsService,
    GcpService,
    AzureService,
    CloudResourceService,
    CloudCostService,
    CloudSecretsService,
    AwsEcsExecutor,
    AwsLambdaExecutor,
    GcpCloudRunExecutor,
    AzureContainerAppsExecutor,
  ],
  exports: [
    AwsService,
    GcpService,
    AzureService,
    CloudResourceService,
    CloudCostService,
    CloudSecretsService,
    AwsEcsExecutor,
    AwsLambdaExecutor,
    GcpCloudRunExecutor,
    AzureContainerAppsExecutor,
  ],
})
export class CloudModule {}
