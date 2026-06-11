import { IoAdapter } from "@nestjs/platform-socket.io";
import { Server, ServerOptions, Socket } from "socket.io";
import { INestApplicationContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export class WsAuthAdapter extends IoAdapter {
  private readonly jwtService: JwtService;

  constructor(app: INestApplicationContext) {
    super(app);
    this.jwtService = app.get(JwtService);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;

    server.use((socket: Socket, next: (err?: Error) => void) => {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.query?.token as string | undefined);

      if (!token) {
        return next(new Error("Authentication required"));
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const payload = this.jwtService.verify(token);
        (socket.data as Record<string, unknown>).user = payload;
        next();
      } catch {
        next(new Error("Invalid token"));
      }
    });

    return server;
  }
}
