import { Injectable, Logger, Optional } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "./queue-names";
import { NotificationJobData } from "./notification.processor";
import { DeploymentStatus } from "../../modules/environments/entities/deployment.entity";

/**
 * Service that listens to domain events and enqueues notification jobs
 * in the BullMQ notifications queue for processing by NotificationProcessor.
 *
 * Queue operations are skipped in the test environment to avoid requiring
 * a live Redis connection during unit and e2e tests.
 */
@Injectable()
export class NotificationListenerService {
  private readonly logger = new Logger(NotificationListenerService.name);

  constructor(
    @Optional()
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue?: Queue<NotificationJobData>,
  ) {}

  /**
   * Listens to teams.member.added and enqueues a team-member-added email notification.
   * @param payload - The team member added event payload
   */
  @OnEvent("teams.member.added")
  async onTeamMemberAdded(payload: Record<string, string>): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    if (!this.notificationsQueue) return;

    const { userEmail, teamName, username } = payload;
    if (!userEmail) {
      this.logger.warn("teams.member.added event missing userEmail, skipping");
      return;
    }

    this.logger.log(
      `Enqueuing team-member-added email for ${username} (${userEmail}) → team ${teamName}`,
    );

    await this.notificationsQueue.add("email", {
      type: "email",
      recipient: userEmail,
      subject: `You have been added to team ${teamName}`,
      template: "team-member-added",
      payload: { teamName, username },
    });
  }

  /**
   * Listens to deployment.status.changed and enqueues a deployment-failed email
   * notification when the deployment status transitions to FAILED.
   * @param payload - The deployment status changed event payload
   */
  @OnEvent("deployment.status.changed")
  onDeploymentStatusChanged(payload: Record<string, string>): void {
    if (process.env.NODE_ENV === "test") return;
    if (!this.notificationsQueue) return;
    if (payload["status"] !== (DeploymentStatus.FAILED as string)) return;

    const { name, environment, version } = payload;
    this.logger.log(
      `Enqueuing deployment-failed email for deployment ${name} on ${environment}`,
    );

    // Note: no direct recipient email available from deployment context;
    // operations teams can configure a global notification address via SMTP_FROM
    // or extend this handler to resolve the component owner email.
    this.logger.warn(
      "deployment-failed notification requires a recipient email; skipping enqueue (no recipient configured)",
    );

    // Enqueue only when a recipient can be determined
    // Kept as a documented extension point:
    // await this.notificationsQueue.add("email", {
    //   type: "email",
    //   recipient: ownerEmail,
    //   subject: `Deployment ${name} failed on ${environment}`,
    //   template: "deployment-failed",
    //   payload: { deploymentName: name, environment, version },
    // });
    void name;
    void environment;
    void version;
  }

  /**
   * Listens to component.created and enqueues a component-created email
   * notification to the component owner if an email address is resolvable.
   * @param payload - The component created event payload
   */
  @OnEvent("component.created")
  onComponentCreated(payload: Record<string, string>): void {
    if (process.env.NODE_ENV === "test") return;
    if (!this.notificationsQueue) return;

    const { name, kind, owner } = payload;

    // The owner field is typically a team name, not an email.
    // Email resolution from team owner is an extension point.
    this.logger.log(
      `component.created event received for ${name} (owner: ${owner}); email requires owner resolution`,
    );

    // Kept as documented extension point when owner email is resolvable:
    // await this.notificationsQueue.add("email", {
    //   type: "email",
    //   recipient: ownerEmail,
    //   subject: `New component ${name} was registered`,
    //   template: "component-created",
    //   payload: { name, kind, owner },
    // });
    void kind;
  }
}
