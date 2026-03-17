import { Test, TestingModule } from "@nestjs/testing";
import { WebhookService } from "./webhook.service";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { AxiosResponse, InternalAxiosRequestConfig } from "axios";

const mockAxiosResponse = (data: unknown): AxiosResponse => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {},
  config: {} as InternalAxiosRequestConfig,
});

/**
 * Build a WebhookService test module with the given URL configuration.
 */
async function buildModule(
  slackUrl: string,
  teamsUrl: string,
  httpPost: jest.Mock,
): Promise<WebhookService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      WebhookService,
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) => {
            if (key === "integrations.slackWebhookUrl") return slackUrl;
            if (key === "integrations.teamsWebhookUrl") return teamsUrl;
            return "";
          },
        },
      },
      { provide: HttpService, useValue: { post: httpPost } },
    ],
  }).compile();

  return module.get<WebhookService>(WebhookService);
}

describe("WebhookService", () => {
  const SLACK_URL = "https://hooks.slack.com/test";
  const TEAMS_URL = "https://outlook.office.com/test";
  let httpPost: jest.Mock;
  let service: WebhookService;

  beforeEach(async () => {
    httpPost = jest.fn().mockReturnValue(of(mockAxiosResponse("ok")));
    service = await buildModule(SLACK_URL, TEAMS_URL, httpPost);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("notify - deployment.status.changed", () => {
    it("should send Slack and Teams notifications for deployment status change", async () => {
      await service.notify("deployment.status.changed", {
        name: "user-service",
        status: "failed",
        environment: "production",
      });

      expect(httpPost).toHaveBeenCalledTimes(2);

      const slackCall = httpPost.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(slackCall[0]).toBe(SLACK_URL);
      expect(slackCall[1]).toEqual({
        text: "Deployment user-service changed to failed on production",
      });

      const teamsCall = httpPost.mock.calls[1] as [
        string,
        Record<string, unknown>,
      ];
      expect(teamsCall[0]).toBe(TEAMS_URL);
      expect(teamsCall[1]).toMatchObject({
        "@type": "MessageCard",
        text: "Deployment user-service changed to failed on production",
      });
    });
  });

  describe("notify - audit.log.created", () => {
    it("should send Slack and Teams notifications for audit log event", async () => {
      await service.notify("audit.log.created", {
        actor: "admin",
        action: "DELETE",
        resource: "component/abc-123",
      });

      expect(httpPost).toHaveBeenCalledTimes(2);
      const slackCall = httpPost.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(slackCall[1]).toEqual({
        text: "Audit: admin performed DELETE on component/abc-123",
      });
    });
  });

  describe("notify - component.created", () => {
    it("should send Slack and Teams notifications for component created event", async () => {
      await service.notify("component.created", {
        name: "payment-service",
        kind: "service",
      });

      expect(httpPost).toHaveBeenCalledTimes(2);
      const slackCall = httpPost.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(slackCall[1]).toEqual({
        text: "New component registered: payment-service (service)",
      });
    });
  });

  describe("notify - error handling", () => {
    it("should not throw when Slack webhook fails", async () => {
      const failingPost = jest
        .fn()
        .mockReturnValueOnce(throwError(() => new Error("Network error")))
        .mockReturnValueOnce(of(mockAxiosResponse("ok")));

      const svc = await buildModule(SLACK_URL, TEAMS_URL, failingPost);
      await expect(
        svc.notify("component.created", { name: "svc", kind: "service" }),
      ).resolves.not.toThrow();
    });

    it("should not throw when Teams webhook fails", async () => {
      const failingPost = jest
        .fn()
        .mockReturnValueOnce(of(mockAxiosResponse("ok")))
        .mockReturnValueOnce(throwError(() => new Error("Teams error")));

      const svc = await buildModule(SLACK_URL, TEAMS_URL, failingPost);
      await expect(
        svc.notify("component.created", { name: "svc", kind: "service" }),
      ).resolves.not.toThrow();
    });
  });

  describe("notify - unconfigured webhooks", () => {
    it("should skip Slack when slackUrl is empty", async () => {
      const post = jest.fn().mockReturnValue(of(mockAxiosResponse("ok")));
      const svc = await buildModule("", TEAMS_URL, post);

      await svc.notify("component.created", { name: "svc", kind: "service" });

      // Only Teams should be called
      expect(post).toHaveBeenCalledTimes(1);
      expect((post.mock.calls[0] as [string, unknown])[0]).toBe(TEAMS_URL);
    });

    it("should skip Teams when teamsUrl is empty", async () => {
      const post = jest.fn().mockReturnValue(of(mockAxiosResponse("ok")));
      const svc = await buildModule(SLACK_URL, "", post);

      await svc.notify("component.created", { name: "svc", kind: "service" });

      // Only Slack should be called
      expect(post).toHaveBeenCalledTimes(1);
      expect((post.mock.calls[0] as [string, unknown])[0]).toBe(SLACK_URL);
    });

    it("should make no HTTP calls when both URLs are empty", async () => {
      const post = jest.fn();
      const svc = await buildModule("", "", post);

      await svc.notify("component.created", { name: "svc", kind: "service" });

      expect(post).not.toHaveBeenCalled();
    });
  });
});
