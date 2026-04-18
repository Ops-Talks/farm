// Mock passport-ldapauth BEFORE any imports that trigger the require() call.
// This prevents the strategy from attempting a real LDAP connection during tests.
jest.mock("passport-ldapauth", () => {
  class MockLdapStrategy {
    options: Record<string, unknown>;
    _verify: ((user: unknown, done: unknown) => void) | undefined;
    constructor(
      options: Record<string, unknown>,
      verify?: (user: unknown, done: unknown) => void,
    ) {
      this.options = options;
      this._verify = verify;
    }
  }
  return MockLdapStrategy;
});

import { LdapAuthStrategy } from "./ldap.strategy";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { User } from "../entities/user.entity";

// ---------------------------------------------------------------------------
// Shared mock helpers
// ---------------------------------------------------------------------------

const buildMockConfigService = (overrides: Record<string, string> = {}) => ({
  get: jest.fn((key: string): string => {
    const defaults: Record<string, string> = {
      "ldap.url": "ldap://localhost:389",
      "ldap.bindDn": "cn=admin,dc=example,dc=com",
      "ldap.bindPassword": "secret",
      "ldap.searchBase": "dc=example,dc=com",
      "ldap.searchFilter": "(uid={{username}})",
      "ldap.adminGroup": "cn=admins,dc=example,dc=com",
      ...overrides,
    };
    return defaults[key] ?? "";
  }),
});

const mockAuthService = {
  findOrCreateOAuthUser: jest.fn(),
};

const mockUser: Partial<User> = {
  id: "user-uuid-1",
  username: "jdoe",
  email: "jdoe@example.com",
  displayName: "John Doe",
  roles: ["user"],
};

describe("LdapAuthStrategy", () => {
  let strategy: LdapAuthStrategy;
  let configService: ReturnType<typeof buildMockConfigService>;

  beforeEach(() => {
    configService = buildMockConfigService();
    strategy = new LdapAuthStrategy(
      configService as unknown as ConfigService,
      mockAuthService as unknown as AuthService,
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  it("should call findOrCreateOAuthUser with ldap provider and user dn", async () => {
    mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
      user: mockUser,
      token: "jwt-token",
      refreshToken: "refresh-token",
    });

    const ldapProfile = {
      dn: "uid=jdoe,dc=example,dc=com",
      uid: "jdoe",
      mail: "jdoe@example.com",
      displayName: "John Doe",
      givenName: "John",
      sn: "Doe",
      memberOf: [],
    };

    const result = await strategy.validate(ldapProfile);

    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "ldap",
      "uid=jdoe,dc=example,dc=com",
      expect.objectContaining({
        displayName: "John Doe",
        firstName: "John",
        lastName: "Doe",
      }),
    );
    expect(result).toEqual(mockUser);
  });

  it("should assign admin role when memberOf contains adminGroup", async () => {
    mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
      user: { ...mockUser, roles: ["admin", "user"] },
      token: "jwt-token",
      refreshToken: "refresh-token",
    });

    const ldapProfile = {
      dn: "uid=jdoe,dc=example,dc=com",
      uid: "jdoe",
      mail: "jdoe@example.com",
      displayName: "John Doe",
      memberOf: [
        "cn=admins,dc=example,dc=com",
        "cn=developers,dc=example,dc=com",
      ],
    };

    await strategy.validate(ldapProfile);

    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "ldap",
      expect.any(String),
      expect.objectContaining({ roles: ["admin", "user"] }),
    );
  });

  it("should assign user role when memberOf does not contain adminGroup", async () => {
    mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
      user: mockUser,
      token: "jwt-token",
      refreshToken: "refresh-token",
    });

    const ldapProfile = {
      dn: "uid=jdoe,dc=example,dc=com",
      uid: "jdoe",
      mail: "jdoe@example.com",
      displayName: "John Doe",
      memberOf: ["cn=developers,dc=example,dc=com"],
    };

    await strategy.validate(ldapProfile);

    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "ldap",
      expect.any(String),
      expect.objectContaining({ roles: ["user"] }),
    );
  });

  it("should use fallback email when mail attribute is absent", async () => {
    mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
      user: mockUser,
      token: "jwt-token",
      refreshToken: "refresh-token",
    });

    const ldapProfile = {
      dn: "uid=jdoe,dc=example,dc=com",
      uid: "jdoe",
      // mail is intentionally omitted
      displayName: "John Doe",
      memberOf: [],
    };

    await strategy.validate(ldapProfile);

    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "ldap",
      expect.any(String),
      expect.objectContaining({ email: "jdoe@ldap.local" }),
    );
  });

  it("should throw when findOrCreateOAuthUser rejects", async () => {
    const error = new Error("DB connection error");
    mockAuthService.findOrCreateOAuthUser.mockRejectedValue(error);

    const ldapProfile = {
      dn: "uid=jdoe,dc=example,dc=com",
      uid: "jdoe",
      mail: "jdoe@example.com",
      displayName: "John Doe",
      memberOf: [],
    };

    await expect(strategy.validate(ldapProfile)).rejects.toThrow(
      "DB connection error",
    );
  });
});
