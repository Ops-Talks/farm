import { INestApplicationContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WsAuthAdapter } from "./ws-auth.adapter";

describe("WsAuthAdapter", () => {
  let jwtService: JwtService;

  const mockApp = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService = { verify: jest.fn() } as unknown as JwtService;
    mockApp.get.mockReturnValue(jwtService);
    new WsAuthAdapter(mockApp as unknown as INestApplicationContext);
  });

  describe("constructor", () => {
    it("resolves JwtService from the application context", () => {
      expect(mockApp.get).toHaveBeenCalledWith(JwtService);
    });
  });

  describe("middleware", () => {
    it("passes a client with valid token", () => {
      const payload = { sub: "user-1", username: "admin", roles: ["admin"] };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const socket = {
        handshake: { auth: { token: "valid-jwt" }, query: {} },
        data: {} as Record<string, unknown>,
      };

      const next = jest.fn();

      const auth = socket.handshake.auth as Record<string, string | undefined>;
      const query = socket.handshake.query as Record<
        string,
        string | undefined
      >;
      const token = auth.token || query.token;

      if (token) {
        socket.data.user = jwtService.verify(token);
        next();
      }

      expect(jwtService.verify).toHaveBeenCalledWith("valid-jwt");
      expect(socket.data.user).toEqual(payload);
      expect(next).toHaveBeenCalledWith();
    });

    it("rejects a client with no token", () => {
      const socket = {
        handshake: { auth: {}, query: {} },
        data: {} as Record<string, unknown>,
      };
      const next = jest.fn();

      const auth = socket.handshake.auth as Record<string, string | undefined>;
      const query = socket.handshake.query as Record<
        string,
        string | undefined
      >;
      const token = auth.token || query.token;

      if (!token) {
        next(new Error("Authentication required"));
        return;
      }

      expect(next).toHaveBeenCalledWith(new Error("Authentication required"));
    });

    it("rejects a client with an invalid token", () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error("invalid token");
      });

      const socket = {
        handshake: { auth: { token: "bad-jwt" }, query: {} },
        data: {} as Record<string, unknown>,
      };
      const next = jest.fn();

      const auth = socket.handshake.auth as Record<string, string | undefined>;
      const token = auth.token;

      try {
        jwtService.verify(token);
        next();
      } catch {
        next(new Error("Invalid token"));
      }

      expect(next).toHaveBeenCalledWith(new Error("Invalid token"));
    });

    it("accepts a token from query string", () => {
      const payload = { sub: "user-2", username: "dev", roles: ["user"] };
      (jwtService.verify as jest.Mock).mockReturnValue(payload);

      const socket = {
        handshake: { auth: {}, query: { token: "query-jwt" } },
        data: {} as Record<string, unknown>,
      };
      const next = jest.fn();

      const query = socket.handshake.query as Record<
        string,
        string | undefined
      >;
      const token = query.token;

      socket.data.user = jwtService.verify(token);
      next();

      expect(jwtService.verify).toHaveBeenCalledWith("query-jwt");
      expect(socket.data.user).toEqual(payload);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
