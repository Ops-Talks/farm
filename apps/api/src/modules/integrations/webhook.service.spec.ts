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

// ---------------------------------------------------------------------------
// WebhookService — additional branch coverage for formatMessage ?? fallbacks
// ---------------------------------------------------------------------------

describe("WebhookService — formatMessage fallback branches", () => {
  let svc: WebhookService;
  const SLACK_URL = "https://hooks.slack.com/test";
  const mockPost = jest.fn();

  beforeEach(async () => {
    mockPost.mockReturnValue(
      of({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );
    svc = await buildModule(SLACK_URL, "", mockPost);
  });

  afterEach(() => jest.clearAllMocks());

  it("should use 'unknown' for deployment name when payload.name is missing", async () => {
    await svc.notify("deployment.status.changed", {
      status: "succeeded",
      environment: "prod",
    });
    const callArg = (mockPost.mock.calls[0] as unknown[])[1] as {
      text: string;
    };
    expect(callArg.text).toContain("unknown");
  });

  it("should use 'unknown' for deployment status when payload.status is missing", async () => {
    await svc.notify("deployment.status.changed", {
      name: "svc",
      environment: "prod",
    });
    const callArg = (mockPost.mock.calls[0] as unknown[])[1] as {
      text: string;
    };
    expect(callArg.text).toContain("unknown");
  });

  it("should use 'unknown' for deployment environment when payload.environment is missing", async () => {
    await svc.notify("deployment.status.changed", {
      name: "svc",
      status: "succeeded",
    });
    const callArg = (mockPost.mock.calls[0] as unknown[])[1] as {
      text: string;
    };
    expect(callArg.text).toContain("unknown");
  });

  it("should use 'unknown' for audit actor when payload.actor is missing", async () => {
    await svc.notify("audit.log.created", {
      action: "create",
      resource: "Component/svc",
    });
    const callArg = (mockPost.mock.calls[0] as unknown[])[1] as {
      text: string;
    };
    expect(callArg.text).toContain("unknown");
  });

  it("should use 'unknown' for audit action when payload.action is missing", async () => {
    await svc.notify("audit.log.created", {
      actor: "admin",
      resource: "Component/svc",
    });
    const callArg = (mockPost.mock.calls[0] as unknown[])[1] as {
      text: string;
    };
    expect(callArg.text).toContain("unknown");
  });

  it("should use 'unknown' for audit resource when payload.resource is missing", async () => {
    await svc.notify("audit.log.created", { actor: "admin", action: "create" });
    const callArg = (mockPost.mock.calls[0] as unknown[])[1] as {
      text: string;
    };
    expect(callArg.text).toContain("unknown");
  });

  it("should use 'unknown' for component name when payload.name is missing", async () => {
    await svc.notify("component.created", { kind: "service" });
    const callArg = (mockPost.mock.calls[0] as unknown[])[1] as {
      text: string;
    };
    expect(callArg.text).toContain("unknown");
  });

  it("should use 'unknown' for component kind when payload.kind is missing", async () => {
    await svc.notify("component.created", { name: "my-svc" });
    const callArg = (mockPost.mock.calls[0] as unknown[])[1] as {
      text: string;
    };
    expect(callArg.text).toContain("unknown");
  });

  it("should produce a generic Event message for unrecognised event types", async () => {
    await svc.notify("some.unknown.event", { foo: "bar" });
    const callArg = (mockPost.mock.calls[0] as unknown[])[1] as {
      text: string;
    };
    expect(callArg.text).toContain("Event: some.unknown.event");
  });
});
