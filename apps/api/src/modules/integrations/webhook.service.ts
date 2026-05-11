import {
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { translateHttpError } from "./http-error";

/**
 * Service responsible for sending HTTP POST payloads to configured webhook URLs.
 * Supports Slack incoming webhooks and Microsoft Teams Office 365 connectors.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly slackUrl: string;
  private readonly teamsUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.slackUrl =
      this.configService.get<string>("integrations.slackWebhookUrl") || "";
    this.teamsUrl =
      this.configService.get<string>("integrations.teamsWebhookUrl") || "";
  }

  /**
   * Sends a notification to all configured webhook URLs (Slack, Teams).
   * Errors are logged individually and do not propagate to callers.
   * @param event - The event name that triggered the notification
   * @param payload - The event payload used to compose the message
   */
  async notify(event: string, payload: object): Promise<void> {
    const message = this.formatMessage(
      event,
      payload as Record<string, string>,
    );

    await Promise.allSettled([
      this.sendSlack(message),
      this.sendTeams(message),
    ]);
  }

  /**
   * Sends a Slack-formatted payload to the configured Slack webhook URL.
   * @param message - The message text to send
   */
  private async sendSlack(message: string): Promise<void> {
    if (!this.slackUrl) return;

    try {
      await firstValueFrom(
        this.httpService.post(
          this.slackUrl,
          { text: message },
          { timeout: 5000 },
        ),
      );
      this.logger.log(`Slack notification sent: ${message}`);
    } catch (err) {
      this.translateHttpError(err, "WebhookService.sendSlack");
    }
  }

  /**
   * Sends a Teams-formatted MessageCard payload to the configured Teams webhook URL.
   * @param message - The message text to send
   */
  private async sendTeams(message: string): Promise<void> {
    if (!this.teamsUrl) return;

    try {
      await firstValueFrom(
        this.httpService.post(
          this.teamsUrl,
          {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            text: message,
          },
          { timeout: 5000 },
        ),
      );
      this.logger.log(`Teams notification sent: ${message}`);
    } catch (err) {
      this.translateHttpError(err, "WebhookService.sendTeams");
    }
  }

  /**
   * Composes a human-readable message from the event name and payload.
   * @param event - The event name
   * @param payload - The event payload
   * @returns A formatted message string
   */
  private formatMessage(
    event: string,
    payload: Record<string, string>,
  ): string {
    switch (event) {
      case "deployment.status.changed":
        return `Deployment ${payload["name"] ?? "unknown"} changed to ${payload["status"] ?? "unknown"} on ${payload["environment"] ?? "unknown"}`;
      case "audit.log.created":
        return `Audit: ${payload["actor"] ?? "unknown"} performed ${payload["action"] ?? "unknown"} on ${payload["resource"] ?? "unknown"}`;
      case "component.created":
        return `New component registered: ${payload["name"] ?? "unknown"} (${payload["kind"] ?? "unknown"})`;
      default:
        return `Event: ${event} - ${JSON.stringify(payload)}`;
    }
  }

  private translateHttpError(err: unknown, operation: string): never {
    return translateHttpError(err, operation, this.logger);
  }
}
