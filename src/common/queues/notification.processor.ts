import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

export const NOTIFICATION_QUEUE = "notifications";

export interface NotificationJobData {
  type: "email" | "webhook";
  recipient: string;
  subject: string;
  payload: Record<string, unknown>;
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { type, recipient, subject } = job.data;
    this.logger.log(
      `Processing ${type} notification "${subject}" to ${recipient} (job ${job.id})`,
    );

    // Placeholder — real implementation will integrate with email/webhook services
    await Promise.resolve();
    this.logger.warn(
      `Notification processor is a placeholder. Job ${job.id} acknowledged but no action taken.`,
    );
  }
}
