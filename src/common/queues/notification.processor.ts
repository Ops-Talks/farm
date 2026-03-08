import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Optional } from "@nestjs/common";
import { Job } from "bullmq";
import { EmailService } from "../email/email.service";

export const NOTIFICATION_QUEUE = "notifications";

export interface NotificationJobData {
  type: "email" | "webhook";
  recipient: string;
  subject: string;
  template?: string;
  payload: Record<string, unknown>;
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(@Optional() private readonly emailService?: EmailService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { type, recipient, subject } = job.data;
    this.logger.log(
      `Processing ${type} notification "${subject}" to ${recipient} (job ${job.id})`,
    );

    switch (type) {
      case "email":
        await this.processEmail(job);
        break;
      case "webhook":
        this.logger.warn(
          `Webhook notifications are not yet implemented. Job ${job.id} skipped.`,
        );
        break;
    }
  }

  private async processEmail(job: Job<NotificationJobData>): Promise<void> {
    if (!this.emailService) {
      this.logger.warn(`EmailService not available. Job ${job.id} skipped.`);
      return;
    }

    const { recipient, subject, template, payload } = job.data;
    const templateName = template || "welcome";

    const sent = await this.emailService.sendMail({
      to: recipient,
      subject,
      template: templateName,
      context: payload,
    });

    if (sent) {
      this.logger.log(`Email notification sent for job ${job.id}`);
    } else {
      this.logger.warn(
        `Email notification not sent for job ${job.id} (SMTP disabled or template error)`,
      );
    }
  }
}
