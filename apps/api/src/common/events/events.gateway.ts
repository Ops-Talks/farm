import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger, Injectable, Optional } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import {
  FarmEvent,
  ComponentEventPayload,
  DeploymentEventPayload,
} from "./events.interfaces";

/**
 * WebSocket gateway for broadcasting real-time events to connected clients.
 * Authenticates connections via JWT token passed in the handshake.
 *
 * Clients connect with: io("ws://host:port/events", { auth: { token: "jwt" } })
 */
@Injectable()
@WebSocketGateway({
  namespace: "/events",
  cors: { origin: "*" },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(@Optional() private readonly jwtService?: JwtService) {}

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.auth as Record<string, string>)?.token ||
      (client.handshake.query?.token as string | undefined);

    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: no token provided`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService?.verify(token) as Record<string, unknown>;
      (client.data as Record<string, unknown>).user = payload;
      this.logger.log(
        `Client connected: ${client.id} (user: ${payload?.username as string})`,
      );
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emits a component.created event to all connected clients.
   */
  emitComponentCreated(payload: ComponentEventPayload): void {
    this.server?.emit(FarmEvent.COMPONENT_CREATED, payload);
  }

  /**
   * Emits a component.updated event to all connected clients.
   */
  emitComponentUpdated(payload: ComponentEventPayload): void {
    this.server?.emit(FarmEvent.COMPONENT_UPDATED, payload);
  }

  /**
   * Emits a component.deleted event to all connected clients.
   */
  emitComponentDeleted(
    payload: Pick<ComponentEventPayload, "id" | "name" | "timestamp">,
  ): void {
    this.server?.emit(FarmEvent.COMPONENT_DELETED, payload);
  }

  /**
   * Emits a deployment.created event to all connected clients.
   */
  emitDeploymentCreated(payload: DeploymentEventPayload): void {
    this.server?.emit(FarmEvent.DEPLOYMENT_CREATED, payload);
  }

  /**
   * Emits a deployment.updated event to all connected clients.
   */
  emitDeploymentUpdated(payload: DeploymentEventPayload): void {
    this.server?.emit(FarmEvent.DEPLOYMENT_UPDATED, payload);
  }
}
