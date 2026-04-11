import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WebhookService } from "./webhook.service";
import { IntegrationsListenerService } from "./integrations-listener.service";
import { IntegrationCredential } from "./entities/integration-credential.entity";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationCredentialController } from "./integration-credential.controller";
import { ArgoCDService } from "./argocd.service";
import { ArgoCDController } from "./argocd.controller";
import { CircleCIService } from "./circleci.service";
import { CircleCIController } from "./circleci.controller";
import { JenkinsService } from "./jenkins.service";
import { JenkinsController } from "./jenkins.controller";
import { TravisCIService } from "./travisci.service";
import { TravisCIController } from "./travisci.controller";
import { WebhookReceiverController } from "./webhook-receiver.controller";
import { GitHubActionsService } from "./github-actions.service";
import { GitHubActionsController } from "./github-actions.controller";
import { AzureDevOpsService } from "./azure-devops.service";
import { AzureDevOpsController } from "./azure-devops.controller";

/**
 * Module that registers webhook notification services, domain event listeners,
 * integration credential management, and CI/CD integration services for
 * ArgoCD, CircleCI, Jenkins, Travis CI, GitHub Actions, and Azure DevOps.
 */
@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([IntegrationCredential])],
  controllers: [
    IntegrationCredentialController,
    ArgoCDController,
    CircleCIController,
    JenkinsController,
    TravisCIController,
    WebhookReceiverController,
    GitHubActionsController,
    AzureDevOpsController,
  ],
  providers: [
    WebhookService,
    IntegrationsListenerService,
    IntegrationCredentialService,
    ArgoCDService,
    CircleCIService,
    JenkinsService,
    TravisCIService,
    GitHubActionsService,
    AzureDevOpsService,
  ],
  exports: [
    WebhookService,
    IntegrationCredentialService,
    ArgoCDService,
    CircleCIService,
    JenkinsService,
    TravisCIService,
    GitHubActionsService,
    AzureDevOpsService,
  ],
})
export class IntegrationsModule {}
