import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";

describe("EmailService", () => {
  let service: EmailService;

  const mockConfigValues: Record<string, string | number | boolean> = {
    "smtp.host": "",
    "smtp.port": 587,
    "smtp.secure": false,
    "smtp.user": "",
    "smtp.pass": "",
    "smtp.from": "Farm <noreply@farm.local>",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string) =>
                mockConfigValues[key] as string | number | boolean | undefined,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("when SMTP is not configured", () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it("should report disabled", () => {
      expect(service.isEnabled()).toBe(false);
    });

    it("should return false when sending email", async () => {
      const result = await service.sendMail({
        to: "user@example.com",
        subject: "Test",
        template: "welcome",
        context: { displayName: "Test" },
      });
      expect(result).toBe(false);
    });
  });

  describe("when SMTP is configured", () => {
    const mockVerify = jest.fn().mockResolvedValue(true);
    const mockSendMail = jest.fn().mockResolvedValue({ messageId: "123" });

    beforeEach(async () => {
      mockConfigValues["smtp.host"] = "smtp.example.com";
      mockConfigValues["smtp.user"] = "user";
      mockConfigValues["smtp.pass"] = "pass";

      // Mock nodemailer.createTransport
      jest
        .spyOn(jest.requireActual("nodemailer"), "createTransport")
        .mockReturnValue({
          verify: mockVerify,
          sendMail: mockSendMail,
        });

      // Re-create service with SMTP host set
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(
                (key: string) =>
                  mockConfigValues[key] as
                    | string
                    | number
                    | boolean
                    | undefined,
              ),
            },
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      await service.onModuleInit();
    });

    afterEach(() => {
      jest.restoreAllMocks();
      mockConfigValues["smtp.host"] = "";
      mockConfigValues["smtp.user"] = "";
      mockConfigValues["smtp.pass"] = "";
    });

    it("should report enabled after successful verification", () => {
      expect(service.isEnabled()).toBe(true);
    });

    it("should verify SMTP connection on init", () => {
      expect(mockVerify).toHaveBeenCalled();
    });

    it("should send email with rendered template", async () => {
      const result = await service.sendMail({
        to: "user@example.com",
        subject: "Welcome",
        template: "welcome",
        context: {
          displayName: "John",
          username: "john",
          email: "john@example.com",
          role: "user",
        },
      });

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Welcome",
          from: "Farm <noreply@farm.local>",
          html: expect.stringContaining("John") as string,
        }),
      );
    });

    it("should return false for unknown template", async () => {
      const result = await service.sendMail({
        to: "user@example.com",
        subject: "Test",
        template: "nonexistent-template",
        context: {},
      });
      expect(result).toBe(false);
    });

    it("should return false when sendMail throws", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP error"));

      const result = await service.sendMail({
        to: "user@example.com",
        subject: "Welcome",
        template: "welcome",
        context: { displayName: "John" },
      });
      expect(result).toBe(false);
    });
  });

  describe("when SMTP verification fails", () => {
    beforeEach(async () => {
      mockConfigValues["smtp.host"] = "bad-host.example.com";

      jest
        .spyOn(jest.requireActual("nodemailer"), "createTransport")
        .mockReturnValue({
          verify: jest.fn().mockRejectedValue(new Error("Connection refused")),
          sendMail: jest.fn(),
        });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(
                (key: string) =>
                  mockConfigValues[key] as
                    | string
                    | number
                    | boolean
                    | undefined,
              ),
            },
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      await service.onModuleInit();
    });

    afterEach(() => {
      jest.restoreAllMocks();
      mockConfigValues["smtp.host"] = "";
    });

    it("should report disabled after failed verification", () => {
      expect(service.isEnabled()).toBe(false);
    });
  });
});
