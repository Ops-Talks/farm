import { Injectable, Logger, Optional } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { WebhookService } from "./webhook.service";
import { FarmEvent } from "../../common/events/events.interfaces";
import { PipelinesService } from "../pipelines/pipelines.service";

/**
 * Service that listens to domain events via EventEmitter2 and
 * forwards them to configured webhook integrations (Slack, Teams).
 * Also handles CI_BUILD_UPDATED events to update pipeline stage results.
 */
@Injectable()
export class IntegrationsListenerService {
  private readonly logger = new Logger(IntegrationsListenerService.name);

  constructor(
    private readonly webhookService: WebhookService,
    @Optional() private readonly pipelinesService?: PipelinesService,
  ) {}

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

  /**
   * Handles CI_BUILD_UPDATED events from webhook receivers and routes them
   * to the PipelinesService for stage result updates.
   *
   * @param payload - The CI build updated event payload
   */
  @OnEvent(FarmEvent.CI_BUILD_UPDATED)
  async onCIBuildUpdated(payload: Record<string, unknown>): Promise<void> {
    const source =
      typeof payload["source"] === "string" ? payload["source"] : "unknown";
    this.logger.debug(`Received ci.build.updated: source=${source}`);

    if (!this.pipelinesService) return;

    if (source === "github-actions") {
      const action = payload["action"] as string | undefined;
      const workflowRun = payload["workflow_run"] as
        | Record<string, unknown>
        | undefined;

      if (
        action === "workflow_run" &&
        workflowRun &&
        workflowRun["conclusion"] !== null &&
        workflowRun["conclusion"] !== undefined
      ) {
        const externalRunId = String(workflowRun["id"]);
        const ciStatus =
          typeof workflowRun["status"] === "string"
            ? workflowRun["status"]
            : "";
        const ciConclusion =
          typeof workflowRun["conclusion"] === "string"
            ? workflowRun["conclusion"]
            : null;
        const htmlUrl =
          typeof workflowRun["html_url"] === "string"
            ? workflowRun["html_url"]
            : null;

        await this.pipelinesService.updateStageFromExternalEvent(
          externalRunId,
          ciStatus,
          ciConclusion,
          htmlUrl,
        );
      }
    }
  }
}
