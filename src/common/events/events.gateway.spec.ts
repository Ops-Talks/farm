import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";
import { EventsGateway } from "./events.gateway";
import { FarmEvent } from "./events.interfaces";

describe("EventsGateway", () => {
  let gateway: EventsGateway;
  let jwtService: JwtService;

  const mockServer = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    jwtService = module.get<JwtService>(JwtService);
    // Assign mock server directly to the gateway's WebSocket server property
    Object.defineProperty(gateway, "server", { value: mockServer });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  describe("handleConnection", () => {
    it("should accept a client with a valid token", () => {
      const payload = { sub: "user-1", username: "admin", roles: ["admin"] };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const client = {
        id: "socket-1",
        handshake: { auth: { token: "valid-jwt" }, query: {} },
        data: {},
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(client);

      expect(jwtService.verify).toHaveBeenCalledWith("valid-jwt");
      expect((client.data as Record<string, unknown>).user).toEqual(payload);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it("should reject a client with no token", () => {
      const client = {
        id: "socket-2",
        handshake: { auth: {}, query: {} },
        data: {},
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it("should reject a client with an invalid token", () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error("invalid token");
      });

      const client = {
        id: "socket-3",
        handshake: { auth: { token: "bad-jwt" }, query: {} },
        data: {},
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it("should accept a token from query string", () => {
      const payload = { sub: "user-2", username: "dev", roles: ["user"] };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const client = {
        id: "socket-4",
        handshake: { auth: {}, query: { token: "query-jwt" } },
        data: {},
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(client);

      expect(jwtService.verify).toHaveBeenCalledWith("query-jwt");
      expect((client.data as Record<string, unknown>).user).toEqual(payload);
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
  });
});
