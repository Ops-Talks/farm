import { ExecutionContext, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LdapAuthGuard } from "./ldap-auth.guard";

// Mock passport strategy to avoid real LDAP connection attempts.
jest.mock("passport-ldapauth", () => {
  class MockLdapStrategy {}
  return MockLdapStrategy;
});

const buildConfigService = (ldapUrl: string | undefined) =>
  ({
    get: jest.fn((key: string) => (key === "ldap.url" ? ldapUrl : undefined)),
  }) as unknown as ConfigService;

const mockContext = {} as ExecutionContext;

describe("LdapAuthGuard", () => {
  it("throws ServiceUnavailableException when ldap.url is not configured", () => {
    const guard = new LdapAuthGuard(buildConfigService(undefined));

    expect(() => guard.canActivate(mockContext)).toThrow(
      ServiceUnavailableException,
    );
    expect(() => guard.canActivate(mockContext)).toThrow(
      "LDAP authentication is not configured",
    );
  });

  it("throws ServiceUnavailableException when ldap.url is an empty string", () => {
    const guard = new LdapAuthGuard(buildConfigService(""));

    expect(() => guard.canActivate(mockContext)).toThrow(
      ServiceUnavailableException,
    );
  });

  it("delegates to super.canActivate when ldap.url is set", () => {
    const guard = new LdapAuthGuard(buildConfigService("ldap://localhost:389"));

    // Spy on the parent AuthGuard's canActivate — stub it to return true.
    const superSpy = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), "canActivate")
      .mockReturnValue(true);

    const result = guard.canActivate(mockContext);

    expect(superSpy).toHaveBeenCalledWith(mockContext);
    expect(result).toBe(true);

    superSpy.mockRestore();
  });
});
