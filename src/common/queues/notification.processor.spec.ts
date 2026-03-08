import { Test, TestingModule } from "@nestjs/testing";
import { NotificationProcessor } from "./notification.processor";
import { EmailService } from "../email/email.service";
import { Job } from "bullmq";

describe("NotificationProcessor", () => {
  let processor: NotificationProcessor;

  const mockEmailService = {
    sendMail: jest.fn().mockResolvedValue(true),
    isEnabled: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  it("should send email for email-type notification", async () => {
    const job = {
      id: "notif-1",
      data: {
        type: "email",
        recipient: "admin@example.com",
        subject: "Welcome",
        template: "welcome",
        payload: { displayName: "Admin" },
      },
    } as unknown as Job;

    await processor.process(job);

    expect(mockEmailService.sendMail).toHaveBeenCalledWith({
      to: "admin@example.com",
      subject: "Welcome",
      template: "welcome",
      context: { displayName: "Admin" },
    });
  });

  it("should use 'welcome' as default template when none specified", async () => {
    const job = {
      id: "notif-2",
      data: {
        type: "email",
        recipient: "user@example.com",
        subject: "Hello",
        payload: { displayName: "User" },
      },
    } as unknown as Job;

    await processor.process(job);

    expect(mockEmailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ template: "welcome" }),
    );
  });

  it("should not call emailService for webhook-type notification", async () => {
    const job = {
      id: "notif-3",
      data: {
        type: "webhook",
        recipient: "https://hooks.example.com/notify",
        subject: "Deploy",
        payload: {},
      },
    } as unknown as Job;

    await processor.process(job);

    expect(mockEmailService.sendMail).not.toHaveBeenCalled();
  });

  it("should handle missing emailService gracefully", async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationProcessor],
    }).compile();

    const processorWithoutEmail = module.get<NotificationProcessor>(
      NotificationProcessor,
    );

    const job = {
      id: "notif-4",
      data: {
        type: "email",
        recipient: "admin@example.com",
        subject: "Test",
        payload: {},
      },
    } as unknown as Job;

    await expect(processorWithoutEmail.process(job)).resolves.toBeUndefined();
  });
});
