import { Test, TestingModule } from "@nestjs/testing";
import { Socket } from "socket.io";
import { EventsGateway } from "./events.gateway";
import { FarmEvent } from "./events.interfaces";

describe("EventsGateway", () => {
  let gateway: EventsGateway;

  const mockServer = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsGateway],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    Object.defineProperty(gateway, "server", { value: mockServer });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  describe("handleConnection", () => {
    it("should log when a client connects", () => {
      const loggerSpy = jest
        .spyOn(gateway["logger"], "log")
        .mockImplementation();

      const client = {
        id: "socket-1",
        data: {},
      } as unknown as Socket;

      gateway.handleConnection(client);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("Client connected: socket-1"),
      );
      loggerSpy.mockRestore();
    });

    it("should log with username when user data is present", () => {
      const loggerSpy = jest
        .spyOn(gateway["logger"], "log")
        .mockImplementation();

      const client = {
        id: "socket-2",
        data: { user: { username: "admin" } },
      } as unknown as Socket;

      gateway.handleConnection(client);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("(user: admin)"),
      );
      loggerSpy.mockRestore();
    });
  });

  describe("handleDisconnect", () => {
    it("should log disconnect without error", () => {
      const client = { id: "socket-5" } as unknown as Socket;
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe("event emission", () => {
    const componentPayload = {
      id: "comp-1",
      name: "user-service",
      kind: "service",
      owner: "platform-team",
      timestamp: "2026-03-08T00:00:00.000Z",
    };

    const deploymentPayload = {
      id: "dep-1",
      componentId: "comp-1",
      environmentId: "env-1",
      version: "v1.0.0",
      status: "pending",
      timestamp: "2026-03-08T00:00:00.000Z",
    };

    it("should emit component.created event", () => {
      gateway.emitComponentCreated(componentPayload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.COMPONENT_CREATED,
        componentPayload,
      );
    });

    it("should emit component.updated event", () => {
      gateway.emitComponentUpdated(componentPayload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.COMPONENT_UPDATED,
        componentPayload,
      );
    });

    it("should emit component.deleted event", () => {
      const deletePayload = {
        id: "comp-1",
        name: "user-service",
        timestamp: "2026-03-08T00:00:00.000Z",
      };
      gateway.emitComponentDeleted(deletePayload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.COMPONENT_DELETED,
        deletePayload,
      );
    });

    it("should emit deployment.created event", () => {
      gateway.emitDeploymentCreated(deploymentPayload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.DEPLOYMENT_CREATED,
        deploymentPayload,
      );
    });

    it("should emit deployment.updated event", () => {
      gateway.emitDeploymentUpdated(deploymentPayload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.DEPLOYMENT_UPDATED,
        deploymentPayload,
      );
    });

    it("should emit pipeline.run.updated event", () => {
      const payload = {
        id: "run-1",
        pipelineId: "pipe-1",
        status: "running",
        triggeredBy: "user-1",
        startedAt: null,
        finishedAt: null,
        durationMs: null,
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitPipelineRunUpdated(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.PIPELINE_RUN_UPDATED,
        payload,
      );
    });

    it("should emit pipeline.log event", () => {
      const payload = {
        runId: "run-1",
        stage: "build",
        message: "Building...",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitPipelineLog(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.PIPELINE_LOG,
        payload,
      );
    });

    it("should emit incident.created event", () => {
      const payload = {
        id: "inc-1",
        title: "DB down",
        severity: "critical",
        status: "open",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitIncidentCreated(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.INCIDENT_CREATED,
        payload,
      );
    });

    it("should emit incident.status-changed event", () => {
      const payload = {
        id: "inc-1",
        title: "DB down",
        previousStatus: "open",
        newStatus: "resolved",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitIncidentStatusChanged(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.INCIDENT_STATUS_CHANGED,
        payload,
      );
    });

    it("should emit scaffold.completed event", () => {
      const payload = {
        id: "sc-1",
        templateName: "node-service",
        targetRepository: "org/repo",
        status: "completed",
        requestedBy: "user-1",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitScaffoldCompleted(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.SCAFFOLD_COMPLETED,
        payload,
      );
    });

    it("should emit scaffold.failed event", () => {
      const payload = {
        id: "sc-2",
        templateName: "node-service",
        targetRepository: "org/repo",
        status: "failed",
        requestedBy: "user-1",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitScaffoldFailed(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.SCAFFOLD_FAILED,
        payload,
      );
    });

    it("should emit env-request.created event", () => {
      const payload = {
        id: "req-1",
        name: "staging",
        type: "ephemeral",
        status: "pending",
        requestedBy: "user-1",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitEnvRequestCreated(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.ENV_REQUEST_CREATED,
        payload,
      );
    });

    it("should emit env-request.decided event", () => {
      const payload = {
        id: "req-1",
        name: "staging",
        type: "ephemeral",
        status: "approved",
        requestedBy: "user-1",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitEnvRequestDecided(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.ENV_REQUEST_DECIDED,
        payload,
      );
    });

    it("should emit env-request.provisioned event", () => {
      const payload = {
        id: "req-1",
        name: "staging",
        type: "ephemeral",
        status: "provisioned",
        requestedBy: "user-1",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitEnvRequestProvisioned(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.ENV_REQUEST_PROVISIONED,
        payload,
      );
    });

    it("should emit env-request.expired event", () => {
      const payload = {
        id: "req-1",
        name: "staging",
        type: "ephemeral",
        status: "expired",
        requestedBy: "user-1",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitEnvRequestExpired(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.ENV_REQUEST_EXPIRED,
        payload,
      );
    });

    it("should emit container:vulnerability-found event", () => {
      const payload = {
        componentId: "comp-1",
        componentName: "api",
        criticalCount: 2,
        image: "nginx",
        tag: "latest",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitContainerVulnerabilityFound(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.CONTAINER_VULNERABILITY_FOUND,
        payload,
      );
    });

    it("should emit cost:budget-exceeded event", () => {
      const payload = {
        componentId: "comp-1",
        delta: 10.5,
        pipelineRunId: "run-1",
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitCostBudgetExceeded(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.COST_BUDGET_EXCEEDED,
        payload,
      );
    });

    it("should emit cost:actual-budget-exceeded event", () => {
      const payload = {
        componentId: "comp-1",
        totalCost: 150,
        budgetUsd: 100,
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      gateway.emitCostActualBudgetExceeded(payload);
      expect(mockServer.emit).toHaveBeenCalledWith(
        FarmEvent.COST_ACTUAL_BUDGET_EXCEEDED,
        payload,
      );
    });
  });

  describe("event emission — server not assigned", () => {
    it("should not throw when server is undefined", () => {
      const gatewayNoServer = new EventsGateway();
      // server is not assigned yet (undefined)
      expect(() =>
        gatewayNoServer.emitComponentCreated({
          id: "comp-1",
          name: "test",
          kind: "service",
          owner: "team",
          timestamp: "2026-01-01T00:00:00.000Z",
        }),
      ).not.toThrow();
    });
  });
});
