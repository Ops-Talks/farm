import { Module, Global } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";

/**
 * Global module that provides the WebSocket EventsGateway.
 * Connection authentication is handled by WsAuthAdapter (IoAdapter),
 * which resolves JwtService from the application context directly.
 *
 * Being @Global(), the EventsGateway is injectable in any service
 * without explicit module imports.
 */
@Global()
@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
