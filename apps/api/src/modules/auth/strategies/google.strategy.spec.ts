import { GoogleStrategy } from "./google.strategy";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { User } from "../entities/user.entity";

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      "oauth.google.clientId": "test-client-id",
      "oauth.google.clientSecret": "test-client-secret",
      "oauth.google.callbackUrl":
        "http://localhost:3000/api/v1/auth/google/callback",
    };
    return config[key] || "";
  }),
};

const mockAuthService = {
  findOrCreateOAuthUser: jest.fn(),
};

describe("GoogleStrategy", () => {
  let strategy: GoogleStrategy;

  beforeEach(() => {
    strategy = new GoogleStrategy(
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

  it("should call findOrCreateOAuthUser with google provider and profile data", async () => {
    const mockUser: Partial<User> = {
      id: "user-uuid-1",
      username: "john_doe",
      email: "john@gmail.com",
      displayName: "John Doe",
    };

    mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
      user: mockUser,
      token: "jwt-token",
      refreshToken: "refresh-token",
    });

    const profile = {
      id: "google-id-1",
      displayName: "John Doe",
      name: { givenName: "John", familyName: "Doe" },
      emails: [{ value: "john@gmail.com" }],
    };

    const done = jest.fn();
    await strategy.validate(
      "access-token",
      "refresh-token",
      profile as any,
      done,
    );

    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "google",
      "google-id-1",
      {
        email: "john@gmail.com",
        displayName: "John Doe",
      },
    );
    expect(done).toHaveBeenCalledWith(null, mockUser);
  });

  it("should use fallback email when profile has no emails", async () => {
    const mockUser: Partial<User> = { id: "user-uuid-2" };
    mockAuthService.findOrCreateOAuthUser.mockResolvedValue({
      user: mockUser,
      token: "jwt-token",
      refreshToken: "refresh-token",
    });

    const profile = {
      id: "google-id-2",
      displayName: "Anonymous",
      emails: [],
    };

    const done = jest.fn();
    await strategy.validate(
      "access-token",
      "refresh-token",
      profile as any,
      done,
    );

    expect(mockAuthService.findOrCreateOAuthUser).toHaveBeenCalledWith(
      "google",
      "google-id-2",
      expect.objectContaining({ email: "google-id-2@google.oauth" }),
    );
    expect(done).toHaveBeenCalledWith(null, mockUser);
  });

  it("should call done with error when findOrCreateOAuthUser throws", async () => {
    const error = new Error("Service error");
    mockAuthService.findOrCreateOAuthUser.mockRejectedValue(error);

    const profile = {
      id: "google-id-3",
      displayName: "Jane",
      emails: [{ value: "jane@gmail.com" }],
    };

    const done = jest.fn();
    await strategy.validate(
      "access-token",
      "refresh-token",
      profile as any,
      done,
    );

    expect(done).toHaveBeenCalledWith(error);
  });
});
