import { Test, TestingModule } from "@nestjs/testing";
import { IntegrationsListenerService } from "./integrations-listener.service";
import { WebhookService } from "./webhook.service";
import { PipelinesService } from "../pipelines/pipelines.service";

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

  describe("onCIBuildUpdated — without PipelinesService", () => {
    it("should return early without error when pipelinesService is not provided", async () => {
      const payload = {
        source: "github-actions",
        action: "workflow_run",
        workflow_run: { id: 42, status: "completed", conclusion: "success" },
      };

      // pipelinesService is not injected in this module, so onCIBuildUpdated
      // should silently return without throwing.
      await expect(service.onCIBuildUpdated(payload)).resolves.toBeUndefined();
    });
  });
});

describe("IntegrationsListenerService — with PipelinesService", () => {
  let service: IntegrationsListenerService;
  let webhookService: { notify: jest.Mock };
  let pipelinesService: { updateStageFromExternalEvent: jest.Mock };

  beforeEach(async () => {
    webhookService = { notify: jest.fn().mockResolvedValue(undefined) };
    pipelinesService = {
      updateStageFromExternalEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsListenerService,
        { provide: WebhookService, useValue: webhookService },
        { provide: PipelinesService, useValue: pipelinesService },
      ],
    }).compile();

    service = module.get<IntegrationsListenerService>(
      IntegrationsListenerService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe("onCIBuildUpdated", () => {
    it("calls updateStageFromExternalEvent for a completed github-actions workflow_run", async () => {
      const payload = {
        source: "github-actions",
        action: "workflow_run",
        workflow_run: {
          id: 42,
          status: "completed",
          conclusion: "success",
          html_url: "https://github.com/acme/repo/actions/runs/42",
        },
      };

      await service.onCIBuildUpdated(payload);

      expect(
        pipelinesService.updateStageFromExternalEvent,
      ).toHaveBeenCalledWith(
        "42",
        "completed",
        "success",
        "https://github.com/acme/repo/actions/runs/42",
      );
    });

    it("does not call updateStageFromExternalEvent when conclusion is null", async () => {
      const payload = {
        source: "github-actions",
        action: "workflow_run",
        workflow_run: { id: 42, status: "in_progress", conclusion: null },
      };

      await service.onCIBuildUpdated(payload);

      expect(
        pipelinesService.updateStageFromExternalEvent,
      ).not.toHaveBeenCalled();
    });

    it("does not call updateStageFromExternalEvent when action is not workflow_run", async () => {
      const payload = {
        source: "github-actions",
        action: "requested",
        workflow_run: { id: 42, status: "queued", conclusion: null },
      };

      await service.onCIBuildUpdated(payload);

      expect(
        pipelinesService.updateStageFromExternalEvent,
      ).not.toHaveBeenCalled();
    });

    it("does not call updateStageFromExternalEvent for unknown source", async () => {
      const payload = {
        source: "jenkins",
        buildId: "build-1",
        status: "SUCCESS",
      };

      await service.onCIBuildUpdated(payload);

      expect(
        pipelinesService.updateStageFromExternalEvent,
      ).not.toHaveBeenCalled();
    });

    it("passes null htmlUrl when html_url is not a string", async () => {
      const payload = {
        source: "github-actions",
        action: "workflow_run",
        workflow_run: {
          id: 99,
          status: "completed",
          conclusion: "failure",
          html_url: 12345, // non-string
        },
      };

      await service.onCIBuildUpdated(payload);

      expect(
        pipelinesService.updateStageFromExternalEvent,
      ).toHaveBeenCalledWith("99", "completed", "failure", null);
    });
  });
});
