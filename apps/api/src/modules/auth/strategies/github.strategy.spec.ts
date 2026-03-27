import { GithubStrategy } from "./github.strategy";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { User } from "../entities/user.entity";
import type { Profile } from "passport-github2";

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      "oauth.github.clientId": "test-client-id",
      "oauth.github.clientSecret": "test-client-secret",
      "oauth.github.callbackUrl":
        "http://localhost:3000/api/v1/auth/github/callback",
    };
    return config[key] || "";
  }),
};

const mockAuthService = {
  findOrCreateOAuthUser: jest.fn(),
};

describe("GithubStrategy", () => {
  let strategy: GithubStrategy;

  beforeEach(() => {
    strategy = new GithubStrategy(
      mockConfigService as unknown as ConfigService,
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

  it("should call findOrCreateOAuthUser with github provider and profile data", async () => {
    const mockUser: Partial<User> = {
      id: "user-uuid-1",
      username: "octocat",
      email: "octocat@github.com",
      displayName: "The Octocat",
    };

    mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
      user: mockUser,
      token: "jwt-token",
      refreshToken: "refresh-token",
    });

    const profile = {
      id: "12345",
      username: "octocat",
      displayName: "The Octocat",
      emails: [{ value: "octocat@github.com" }],
    };

    const done = jest.fn();
    await strategy.validate(
      "access-token",
      "refresh-token",
      profile as unknown as Profile,
      done,
    );

    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "github",
      "12345",
      {
        email: "octocat@github.com",
        displayName: "The Octocat",
        username: "octocat",
      },
    );
    expect(done).toHaveBeenCalledWith(null, mockUser);
  });

  it("should use fallback email when profile has no emails", async () => {
    const mockUser: Partial<User> = {
      id: "user-uuid-2",
      username: "github_99999",
    };
    mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
      user: mockUser,
      token: "jwt-token",
      refreshToken: "refresh-token",
    });

    const profile = {
      id: "99999",
      username: "unknown",
      displayName: "",
      emails: [],
    };

    const done = jest.fn();
    await strategy.validate(
      "access-token",
      "refresh-token",
      profile as unknown as Profile,
      done,
    );

    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "github",
      "99999",
      expect.objectContaining({ email: "99999@github.oauth" }),
    );
    expect(done).toHaveBeenCalledWith(null, mockUser);
  });

  it("should call done with error when findOrCreateOAuthUser throws", async () => {
    const error = new Error("DB error");
    mockAuthService.findOrCreateOAuthUser.mockRejectedValue(error);

    const profile = {
      id: "12345",
      username: "octocat",
      displayName: "The Octocat",
      emails: [{ value: "octocat@github.com" }],
    };

    const done = jest.fn();
    await strategy.validate(
      "access-token",
      "refresh-token",
      profile as unknown as Profile,
      done,
    );

    expect(done).toHaveBeenCalledWith(error);
  });
});
