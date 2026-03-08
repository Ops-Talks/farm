import { Test, TestingModule } from "@nestjs/testing";
import { NotificationProcessor } from "./notification.processor";
import { Job } from "bullmq";

describe("NotificationProcessor", () => {
  let processor: NotificationProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationProcessor],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  it("should process a notification job without error", async () => {
    const job = {
      id: "notif-1",
      data: {
        type: "email",
        recipient: "admin@example.com",
        subject: "Test Notification",
        payload: { key: "value" },
      },
    } as Job;

    await expect(processor.process(job)).resolves.toBeUndefined();
  });
});
