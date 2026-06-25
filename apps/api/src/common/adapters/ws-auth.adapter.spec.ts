import { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { JwtService } from "@nestjs/jwt";
import { WsAuthAdapter } from "./ws-auth.adapter";

const mockServer = { use: jest.fn() };

jest.spyOn(IoAdapter.prototype, "createIOServer").mockReturnValue(mockServer);

describe("WsAuthAdapter", () => {
  let adapter: WsAuthAdapter;
  let jwtService: JwtService;

  const mockApp = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService = { verify: jest.fn() } as unknown as JwtService;
    mockApp.get.mockReturnValue(jwtService);
    adapter = new WsAuthAdapter(mockApp as unknown as INestApplicationContext);
  });

  describe("constructor", () => {
    it("resolves JwtService from the application context", () => {
      expect(mockApp.get).toHaveBeenCalledWith(JwtService);
    });
  });

  describe("createIOServer", () => {
    function getMiddleware(): (
      socket: Record<string, unknown>,
      next: (err?: Error) => void,
    ) => void {
      const server = adapter.createIOServer(3001);
      expect(server.use).toHaveBeenCalledWith(expect.any(Function));
      const useMock = server.use as jest.Mock;
      const calls = useMock.mock.calls as unknown[][];
      return calls[0][0] as (
        socket: Record<string, unknown>,
        next: (err?: Error) => void,
      ) => void;
    }

    it("registers a middleware on the server", () => {
      const middleware = getMiddleware();
      expect(typeof middleware).toBe("function");
    });

    it("passes a client with valid token", () => {
      const middleware = getMiddleware();
      const payload = { sub: "user-1", username: "admin", roles: ["admin"] };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const socket = {
        handshake: { auth: { token: "valid-jwt" }, query: {} },
        data: {},
      };
      const next = jest.fn();

      middleware(socket, next);

      expect(jwtService.verify).toHaveBeenCalledWith("valid-jwt");
      expect((socket.data as Record<string, unknown>).user).toEqual(payload);
      expect(next).toHaveBeenCalledWith();
    });

    it("rejects a client with no token", () => {
      const middleware = getMiddleware();
      const socket = {
        handshake: { auth: {}, query: {} },
        data: {},
      };
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith(new Error("Authentication required"));
    });

    it("rejects a client with an invalid token", () => {
      const middleware = getMiddleware();
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error("invalid token");
      });

      const socket = {
        handshake: { auth: { token: "bad-jwt" }, query: {} },
        data: {},
      };
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith(new Error("Invalid token"));
    });

    it("accepts a token from query string", () => {
      const middleware = getMiddleware();
      const payload = { sub: "user-2", username: "dev", roles: ["user"] };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const socket = {
        handshake: { auth: {}, query: { token: "query-jwt" } },
        data: {},
      };
      const next = jest.fn();

      middleware(socket, next);

      expect(jwtService.verify).toHaveBeenCalledWith("query-jwt");
      expect((socket.data as Record<string, unknown>).user).toEqual(payload);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
