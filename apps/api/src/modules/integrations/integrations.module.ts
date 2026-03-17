import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { WebhookService } from "./webhook.service";
import { IntegrationsListenerService } from "./integrations-listener.service";

/**
 * Module that registers webhook notification services and domain event listeners
 * for Slack and Microsoft Teams integrations.
 */
@Module({
  imports: [HttpModule],
  providers: [WebhookService, IntegrationsListenerService],
  exports: [WebhookService],
})
export class IntegrationsModule {}
