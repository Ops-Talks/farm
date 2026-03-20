import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { User } from "./entities/user.entity";

jest.mock("bcrypt");

describe("AuthService", () => {
  let service: AuthService;

  const mockUser: User = {
    id: "uuid",
    username: "john",
    email: "john@example.com",
    displayName: "John",
    password: "hashed_password",
    roles: ["user"],
    refreshToken: null as unknown as string,
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto: unknown) => dto as User),
    save: jest.fn().mockImplementation((user: User) =>
      Promise.resolve({
        ...user,
        id: user.id ?? "uuid",
      } as User),
    ),
    find: jest.fn().mockResolvedValue([mockUser]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue("mock-jwt-token"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-token");
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("should register a user", async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);
      const dto = {
        username: "new",
        email: "new@ex.com",
        password: "pw",
        displayName: "New",
      };
      const result = await service.register(dto);
      expect(result.username).toBe(dto.username);
    });

    it("should throw ConflictException if user exists", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      await expect(
        service.register({
          username: "john",
          email: "john@ex.com",
          password: "pw",
          displayName: "John",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("should login with valid credentials and return refreshToken", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        username: "john",
        password: "password",
      });

      expect(result.token).toBe("mock-jwt-token");
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.refreshToken).toBe("string");
      expect(result.user.username).toBe(mockUser.username);
      expect(mockRepository.update).toHaveBeenCalledWith("uuid", {
        refreshToken: "hashed-token",
      });
    });

    it("should throw UnauthorizedException for invalid password", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: "john", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("findOrCreateOAuthUser", () => {
    const oauthUser: User = {
      ...mockUser,
      oauthProvider: "github",
      oauthProviderId: "gh-123",
    };

    it("should return existing user when found by OAuth provider and provider ID", async () => {
      // Branch: outer `if (!user)` is false — user already linked to this OAuth identity
      mockRepository.findOne.mockResolvedValueOnce(oauthUser);

      const result = await service.findOrCreateOAuthUser("github", "gh-123", {
        email: "john@example.com",
        displayName: "John",
        username: "john",
      });

      expect(result.user).toEqual(oauthUser);
      expect(result.token).toBe("mock-jwt-token");
      expect(result.refreshToken).toBeDefined();
      // Only one findOne call — no further lookups needed
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it("should link an existing local account when found by email after OAuth miss", async () => {
      // Branch: `if (!user)` true -> `if (profile.email)` true -> `if (user)` true (link existing)
      const localUser: User = {
        ...mockUser,
        oauthProvider: null,
        oauthProviderId: null,
      };

      // 1st call: by oauthProvider+oauthProviderId -> not found
      mockRepository.findOne.mockResolvedValueOnce(null);
      // 2nd call: by email -> found (existing local user)
      mockRepository.findOne.mockResolvedValueOnce(localUser);

      const result = await service.findOrCreateOAuthUser("github", "gh-456", {
        email: "john@example.com",
        displayName: "John",
        username: "john",
      });

      expect(mockRepository.update).toHaveBeenCalledWith(
        localUser.id,
        expect.objectContaining({
          oauthProvider: "github",
          oauthProviderId: "gh-456",
        }),
      );
      expect(result.user.oauthProvider).toBe("github");
      expect(result.user.oauthProviderId).toBe("gh-456");
    });

    it("should create a new user when no local account matches the email", async () => {
      // Branch: `if (!user)` true -> `if (profile.email)` true -> `if (user)` false (create new)
      // profile.username provided -> uses profile.username as the base username

      // 1st call: by oauthProvider+oauthProviderId -> null
      mockRepository.findOne.mockResolvedValueOnce(null);
      // 2nd call: by email -> null (no existing local account)
      mockRepository.findOne.mockResolvedValueOnce(null);
      // 3rd call: ensureUniqueUsername first candidate -> null (no collision)
      mockRepository.findOne.mockResolvedValueOnce(null);

      const newUser: User = {
        ...mockUser,
        username: "gh_user",
        email: "new@example.com",
        oauthProvider: "github",
        oauthProviderId: "gh-789",
      };
      mockRepository.save.mockResolvedValueOnce(newUser);

      const result = await service.findOrCreateOAuthUser("github", "gh-789", {
        email: "new@example.com",
        displayName: "GitHub User",
        username: "gh_user",
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "gh_user",
          email: "new@example.com",
          oauthProvider: "github",
          oauthProviderId: "gh-789",
        }),
      );
      expect(result.user).toEqual(newUser);
    });

    it("should generate a username from provider+providerId when profile.username is absent", async () => {
      // Branch: `profile.username ||` false -> uses `${provider}_${providerId}` fallback

      // 1st call: by oauthProvider+oauthProviderId -> null
      mockRepository.findOne.mockResolvedValueOnce(null);
      // 2nd call: by email -> null
      mockRepository.findOne.mockResolvedValueOnce(null);
      // 3rd call: ensureUniqueUsername -> null (no collision)
      mockRepository.findOne.mockResolvedValueOnce(null);

      const createdUser: User = {
        ...mockUser,
        username: "github_gh_999",
        oauthProvider: "github",
        oauthProviderId: "gh-999",
      };
      mockRepository.save.mockResolvedValueOnce(createdUser);

      await service.findOrCreateOAuthUser("github", "gh-999", {
        email: "nouser@example.com",
        displayName: "No Username",
        // username intentionally omitted
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "github_gh_999",
        }),
      );
    });

    it("should use safeUsername as email when profile.email is empty", async () => {
      // Branch: `profile.email || \`${safeUsername}@${provider}.oauth\`` — email falsy

      // 1st call: by oauthProvider+oauthProviderId -> null
      mockRepository.findOne.mockResolvedValueOnce(null);
      // No 2nd call: profile.email is falsy, skip email lookup
      // ensureUniqueUsername -> null (no collision)
      mockRepository.findOne.mockResolvedValueOnce(null);

      const createdUser: User = {
        ...mockUser,
        username: "no_email_user",
        email: "no_email_user@github.oauth",
        oauthProvider: "github",
        oauthProviderId: "gh-noemail",
      };
      mockRepository.save.mockResolvedValueOnce(createdUser);

      await service.findOrCreateOAuthUser("github", "gh-noemail", {
        email: "",
        displayName: "No Email",
        username: "no_email_user",
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "no_email_user@github.oauth",
        }),
      );
    });

    it("should use safeUsername as displayName when profile.displayName is empty", async () => {
      // Branch: `profile.displayName || safeUsername` — displayName falsy

      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.findOne.mockResolvedValueOnce(null);

      const createdUser: User = {
        ...mockUser,
        username: "nodisplayname",
        displayName: "nodisplayname",
        oauthProvider: "github",
        oauthProviderId: "gh-nodisplay",
      };
      mockRepository.save.mockResolvedValueOnce(createdUser);

      await service.findOrCreateOAuthUser("github", "gh-nodisplay", {
        email: "nodisplay@example.com",
        displayName: "",
        username: "nodisplayname",
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "nodisplayname",
        }),
      );
    });
  });

  describe("ensureUniqueUsername (via findOrCreateOAuthUser)", () => {
    it("should append _1 suffix when the base username is already taken", async () => {
      // Branch: while-loop body executes once (one collision, then free)

      const takenUser: User = { ...mockUser, username: "collider" };

      // 1st call: by oauthProvider+oauthProviderId -> null
      mockRepository.findOne.mockResolvedValueOnce(null);
      // 2nd call: by email -> null
      mockRepository.findOne.mockResolvedValueOnce(null);
      // 3rd call: ensureUniqueUsername("collider") -> collision found
      mockRepository.findOne.mockResolvedValueOnce(takenUser);
      // 4th call: ensureUniqueUsername("collider_1") -> free
      mockRepository.findOne.mockResolvedValueOnce(null);

      const createdUser: User = {
        ...mockUser,
        username: "collider_1",
        oauthProvider: "github",
        oauthProviderId: "gh-collide",
      };
      mockRepository.save.mockResolvedValueOnce(createdUser);

      await service.findOrCreateOAuthUser("github", "gh-collide", {
        email: "collider@example.com",
        displayName: "Collider",
        username: "collider",
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: "collider_1" }),
      );
    });

    it("should keep incrementing the suffix until a free username is found", async () => {
      // Branch: while-loop body executes twice (two collisions, then free)

      const takenUser: User = { ...mockUser, username: "taken" };

      // 1st call: by oauthProvider+oauthProviderId -> null
      mockRepository.findOne.mockResolvedValueOnce(null);
      // 2nd call: by email -> null
      mockRepository.findOne.mockResolvedValueOnce(null);
      // 3rd call: ensureUniqueUsername("taken") -> collision
      mockRepository.findOne.mockResolvedValueOnce(takenUser);
      // 4th call: ensureUniqueUsername("taken_1") -> collision
      mockRepository.findOne.mockResolvedValueOnce(takenUser);
      // 5th call: ensureUniqueUsername("taken_2") -> free
      mockRepository.findOne.mockResolvedValueOnce(null);

      const createdUser: User = {
        ...mockUser,
        username: "taken_2",
        oauthProvider: "google",
        oauthProviderId: "g-taken",
      };
      mockRepository.save.mockResolvedValueOnce(createdUser);

      await service.findOrCreateOAuthUser("google", "g-taken", {
        email: "taken@example.com",
        displayName: "Taken User",
        username: "taken",
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: "taken_2" }),
      );
    });
  });
});
