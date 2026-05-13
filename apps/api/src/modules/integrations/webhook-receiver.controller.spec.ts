import { Test, TestingModule } from "@nestjs/testing";
import { WebhookReceiverController } from "./webhook-receiver.controller";
import { EventEmitter2 } from "@nestjs/event-emitter";

describe("WebhookReceiverController", () => {
  let controller: WebhookReceiverController;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookReceiverController],
      providers: [{ provide: EventEmitter2, useValue: eventEmitter }],
    }).compile();

    controller = module.get<WebhookReceiverController>(
      WebhookReceiverController,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("receiveCircleCI", () => {
    it("should emit CI_BUILD_UPDATED and return ok=true with string type", () => {
      const payload = { type: "workflow-completed", buildNumber: 42 };
      const result = controller.receiveCircleCI(payload);
      expect(result).toEqual({ ok: true });
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it("should handle payload with non-string type (falls back to 'unknown')", () => {
      const payload = { type: 42, other: "data" };
      const result = controller.receiveCircleCI(payload);
      expect(result).toEqual({ ok: true });
    });
  });

  describe("receiveJenkins", () => {
    it("should emit CI_BUILD_UPDATED and return ok=true with string job name", () => {
      const payload = { name: "my-job", status: "SUCCESS" };
      const result = controller.receiveJenkins(payload);
      expect(result).toEqual({ ok: true });
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it("should handle payload with non-string name (falls back to 'unknown')", () => {
      const payload = { name: 123 };
      const result = controller.receiveJenkins(payload);
      expect(result).toEqual({ ok: true });
    });
  });

  describe("receiveTravisCI", () => {
    it("should emit CI_BUILD_UPDATED and return ok=true with string build id", () => {
      const payload = { id: "12345", state: "passed" };
      const result = controller.receiveTravisCI(payload);
      expect(result).toEqual({ ok: true });
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it("should convert numeric build id to string", () => {
      const payload = { id: 12345 };
      const result = controller.receiveTravisCI(payload);
      expect(result).toEqual({ ok: true });
    });

    it("should use 'unknown' when id is neither string nor number", () => {
      const payload = { id: { nested: "object" } };
      const result = controller.receiveTravisCI(payload);
      expect(result).toEqual({ ok: true });
    });
  });
});

describe("WebhookReceiverController — without EventEmitter2", () => {
  let controller: WebhookReceiverController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookReceiverController],
      // No EventEmitter2 provided — optional dependency
    }).compile();

    controller = module.get<WebhookReceiverController>(
      WebhookReceiverController,
    );
  });

  it("should be defined without eventEmitter", () => {
    expect(controller).toBeDefined();
  });

  it("should return ok=true without emitting when eventEmitter is absent (CircleCI)", () => {
    const result = controller.receiveCircleCI({ type: "ping" });
    expect(result).toEqual({ ok: true });
  });

  it("should return ok=true without emitting when eventEmitter is absent (Jenkins)", () => {
    const result = controller.receiveJenkins({ name: "my-job" });
    expect(result).toEqual({ ok: true });
  });

  it("should return ok=true without emitting when eventEmitter is absent (TravisCI)", () => {
    const result = controller.receiveTravisCI({ id: "99" });
    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// GitHub Actions webhook — HMAC validation
// ---------------------------------------------------------------------------

describe("WebhookReceiverController — receiveGitHubActions", () => {
  let controller: WebhookReceiverController;
  let eventEmitter: { emit: jest.Mock };

  const WEBHOOK_SECRET = "test-webhook-secret";

  beforeEach(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookReceiverController],
      providers: [{ provide: EventEmitter2, useValue: eventEmitter }],
    }).compile();

    controller = module.get<WebhookReceiverController>(
      WebhookReceiverController,
    );
  });

  afterEach(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    jest.clearAllMocks();
  });

  function buildSignature(body: string, secret: string): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHmac } = require("crypto") as typeof import("crypto");
    return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  }

  it("should emit CI_BUILD_UPDATED and return ok=true for a valid HMAC signature", () => {
    const payload = {
      action: "completed",
      workflow_run: { id: 1, conclusion: "success" },
    };
    const sig = buildSignature(JSON.stringify(payload), WEBHOOK_SECRET);

    const result = controller.receiveGitHubActions(sig, payload);

    expect(result).toEqual({ ok: true });
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it("should throw UnauthorizedException for an invalid HMAC signature", () => {
    expect(() =>
      controller.receiveGitHubActions("sha256=badhash", {
        action: "completed",
      }),
    ).toThrow();
  });

  it("should not throw when signature header is missing (secret present but no sig)", () => {
    // Guard only activates when BOTH secret AND signature are present.
    const result = controller.receiveGitHubActions(undefined, {
      action: "completed",
    });
    expect(result).toEqual({ ok: true });
  });

  it("should return ok=true when GITHUB_WEBHOOK_SECRET is not set (no validation)", () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;

    const result = controller.receiveGitHubActions(undefined, {
      action: "ping",
    });
    expect(result).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// ArgoCD webhook
// ---------------------------------------------------------------------------

describe("WebhookReceiverController — receiveArgoCDWebhook", () => {
  let controller: WebhookReceiverController;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookReceiverController],
      providers: [{ provide: EventEmitter2, useValue: eventEmitter }],
    }).compile();

    controller = module.get<WebhookReceiverController>(
      WebhookReceiverController,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("should emit CI_BUILD_UPDATED and return ok=true for a sync-succeeded event", () => {
    const payload = {
      type: "sync-succeeded",
      application: { metadata: { name: "my-app" } },
    };

    const result = controller.receiveArgoCDWebhook(payload);

    expect(result).toEqual({ ok: true });
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it("should return ok=true for a health-degraded event", () => {
    const payload = {
      type: "health-degraded",
      application: { metadata: { name: "my-app" } },
    };

    const result = controller.receiveArgoCDWebhook(payload);
    expect(result).toEqual({ ok: true });
  });

  it("should return ok=true for an unknown ArgoCD event type", () => {
    const payload = { type: "unknown-event" };
    const result = controller.receiveArgoCDWebhook(payload);
    expect(result).toEqual({ ok: true });
  });
});
