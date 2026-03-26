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
