import { Reflector } from "@nestjs/core";
import { ExecutionContext } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user?: Record<string, unknown>): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it("should allow access when no roles are required", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should deny access when user is not present", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);

    const context = createMockContext(undefined);
    expect(guard.canActivate(context)).toBe(false);
  });

  it("should deny access when user has no roles", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);

    const context = createMockContext({ userId: "1", username: "test" });
    expect(guard.canActivate(context)).toBe(false);
  });

  it("should allow access when user has the required role", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);

    const context = createMockContext({
      userId: "1",
      username: "test",
      roles: ["admin", "user"],
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should deny access when user does not have the required role", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);

    const context = createMockContext({
      userId: "1",
      username: "test",
      roles: ["user"],
    });
    expect(guard.canActivate(context)).toBe(false);
  });

  it("should allow access when user has one of multiple required roles", () => {
    jest
      .spyOn(reflector, "getAllAndOverride")
      .mockReturnValue(["admin", "moderator"]);

    const context = createMockContext({
      userId: "1",
      username: "test",
      roles: ["moderator"],
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});
