import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { WebhookService } from "./webhook.service";

/**
 * Service that listens to domain events via EventEmitter2 and
 * forwards them to configured webhook integrations (Slack, Teams).
 */
@Injectable()
export class IntegrationsListenerService {
  private readonly logger = new Logger(IntegrationsListenerService.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Handles deployment status change events and sends webhook notifications.
   * @param payload - The deployment status changed event payload
   */
  @OnEvent("deployment.status.changed")
  async onDeploymentStatusChanged(
    payload: Record<string, string>,
  ): Promise<void> {
    this.logger.debug(
      `Received deployment.status.changed: ${JSON.stringify(payload)}`,
    );
    await this.webhookService.notify("deployment.status.changed", payload);
  }

  /**
   * Handles audit log created events and sends webhook notifications.
   * @param payload - The audit log created event payload
   */
  @OnEvent("audit.log.created")
  async onAuditLogCreated(payload: Record<string, string>): Promise<void> {
    this.logger.debug(`Received audit.log.created: ${JSON.stringify(payload)}`);
    await this.webhookService.notify("audit.log.created", payload);
  }

  /**
   * Handles component created events and sends webhook notifications.
   * @param payload - The component created event payload
   */
  @OnEvent("component.created")
  async onComponentCreated(payload: Record<string, string>): Promise<void> {
    this.logger.debug(`Received component.created: ${JSON.stringify(payload)}`);
    await this.webhookService.notify("component.created", payload);
  }
}
