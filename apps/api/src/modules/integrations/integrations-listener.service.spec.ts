import { Test, TestingModule } from "@nestjs/testing";
import { IntegrationsListenerService } from "./integrations-listener.service";
import { WebhookService } from "./webhook.service";

describe("IntegrationsListenerService", () => {
  let service: IntegrationsListenerService;
  let webhookService: { notify: jest.Mock };

  beforeEach(async () => {
    webhookService = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsListenerService,
        { provide: WebhookService, useValue: webhookService },
      ],
    }).compile();

    service = module.get<IntegrationsListenerService>(
      IntegrationsListenerService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onDeploymentStatusChanged", () => {
    it("should notify webhooks with the deployment status changed event", async () => {
      const payload = { deploymentId: "dep-1", status: "succeeded" };

      await service.onDeploymentStatusChanged(payload);

      expect(webhookService.notify).toHaveBeenCalledWith(
        "deployment.status.changed",
        payload,
      );
    });
  });

  describe("onAuditLogCreated", () => {
    it("should notify webhooks with the audit log created event", async () => {
      const payload = { action: "component.create", userId: "user-1" };

      await service.onAuditLogCreated(payload);

      expect(webhookService.notify).toHaveBeenCalledWith(
        "audit.log.created",
        payload,
      );
    });
  });

  describe("onComponentCreated", () => {
    it("should notify webhooks with the component created event", async () => {
      const payload = { componentId: "comp-1", name: "my-service" };

      await service.onComponentCreated(payload);

      expect(webhookService.notify).toHaveBeenCalledWith(
        "component.created",
        payload,
      );
    });
  });
});
