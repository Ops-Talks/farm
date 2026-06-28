import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtStrategy } from "../../modules/auth/strategies/jwt.strategy";
import { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let mockContext: ExecutionContext;

  const mockHandler = {};

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("test-secret"),
          },
        },
        JwtAuthGuard,
        Reflector,
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  beforeEach(() => {
    mockContext = {
      getHandler: () => mockHandler,
      getClass: () => ({}) as unknown as jest.Mock,
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ headers: {} }),
        getResponse: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate", () => {
    it("should return true when route is marked with @Public()", () => {
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);
      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it("should delegate to AuthGuard when route is not @Public()", () => {
      const parentProto = Object.getPrototypeOf(JwtAuthGuard.prototype);
      jest.spyOn(parentProto, "canActivate").mockReturnValue(false);
      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
      const result = guard.canActivate(mockContext);
      expect(result).toBe(false);
    });
  });

  describe("handleRequest", () => {
    it("should throw UnauthorizedException when token is expired", () => {
      const expiredError = new TokenExpiredError(
        "jwt expired",
        new Date(Date.now() - 3600000),
      );
      expect(() => guard.handleRequest(null, null, expiredError)).toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when token signature is invalid", () => {
      const jwtError = new JsonWebTokenError("invalid signature");
      expect(() => guard.handleRequest(null, null, jwtError)).toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when user is falsy", () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
    });

    it("should throw the original error when err is provided", () => {
      const customError = new Error("custom auth error");
      expect(() => guard.handleRequest(customError, null, null)).toThrow(
        customError,
      );
    });

    it("should return user when no error and user is valid", () => {
      const user = { id: "user-1", username: "test" };
      const result = guard.handleRequest(null, user, null);
      expect(result).toBe(user);
    });
  });
});
