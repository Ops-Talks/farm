// jest.mock must appear before all imports so it registers before any require().
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("hashed-token"),
  // Return a value >= BCRYPT_ROUNDS so the lazy re-hash branch is not taken
  // in tests that only verify the happy-path of validateUser.
  getRounds: jest.fn().mockReturnValue(12),
}));
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../auth.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { RefreshToken } from "../entities/refresh-token.entity";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { RegisterUserDto } from "../dto/register-user.dto";
import { LoginDto } from "../dto/login.dto";
import { UpdateProfileDto, GenderEnum } from "../dto/update-profile.dto";
import { ChangePasswordDto } from "../dto/change-password.dto";

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
};

const createMockQb = () => ({
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 1 }),
});

const mockRefreshTokenRepo = {
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto: Partial<RefreshToken>) => dto),
  save: jest.fn().mockResolvedValue({ id: "rt-uuid" }),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn().mockImplementation(() => createMockQb()),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue("token"),
};

describe("AuthService", () => {
  let service: AuthService;
  let repo: typeof mockUserRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repo = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockJwtService.sign.mockReturnValue("token");
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-token");
    mockRefreshTokenRepo.create.mockImplementation(
      (dto: Partial<RefreshToken>) => dto,
    );
    mockRefreshTokenRepo.save.mockResolvedValue({ id: "rt-uuid" });
    mockRefreshTokenRepo.createQueryBuilder.mockImplementation(() =>
      createMockQb(),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("should create and return a new user", async () => {
      const dto: RegisterUserDto = {
        username: "u",
        email: "e",
        password: "p",
        displayName: "u",
      };
      repo.findOne.mockResolvedValue(undefined);
      repo.create.mockReturnValue(dto);
      repo.save.mockResolvedValue({ id: "1", ...dto, roles: ["user"] });
      const result = await service.register(dto);
      expect(result).toEqual({ id: "1", ...dto, roles: ["user"] });
      expect(repo.save).toHaveBeenCalled();
    });

    it("should throw conflict when user exists", async () => {
      repo.findOne.mockResolvedValue({ id: "1" });
      await expect(
        service.register({} as RegisterUserDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe("login", () => {
    const user = {
      id: "1",
      username: "u",
      password: "hashed",
      roles: ["user"],
      tokenVersion: 0,
    };

    it("should return user, token, and refreshToken when credentials valid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const loginDto: LoginDto = { username: "u", password: "p" };
      const result = await service.login(loginDto);
      expect(result.user).toEqual(user);
      expect(result.token).toBe("token");
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.refreshToken).toBe("string");
      // Token is now persisted via the refresh_tokens table, not users.refreshToken
      expect(mockRefreshTokenRepo.save).toHaveBeenCalledTimes(1);
    });

    it("should throw unauthorized if user not found", async () => {
      repo.findOne.mockResolvedValue(undefined);
      await expect(
        service.login({ username: "x", password: "p" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should throw unauthorized if password invalid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ username: "u", password: "p" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should throw unauthorized when the user is suspended", async () => {
      repo.findOne.mockResolvedValue({ ...user, suspended: true });
      await expect(
        service.login({ username: "u", password: "p" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should record lastLogin on successful login", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await service.login({ username: "u", password: "p" });
      const updateArgs = repo.update.mock.calls[0] as unknown[];
      const payload = updateArgs[1] as { lastLogin?: Date };
      expect(payload).toHaveProperty("lastLogin");
      expect(payload.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe("refresh", () => {
    const activeToken: RefreshToken = {
      id: "rt-1",
      userId: "1",
      jti: "some-jti",
      familyId: "fam-1",
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      userAgent: null,
      ip: null,
      createdAt: new Date(),
    } as RefreshToken;

    const user = {
      id: "1",
      username: "u",
      roles: ["user"],
      tokenVersion: 0,
    };

    it("should return new token and rotated refreshToken for a valid token", async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue({ ...activeToken });
      mockRefreshTokenRepo.update.mockResolvedValue({ affected: 1 });
      repo.findOne.mockResolvedValue(user);

      // Pass any 80-hex-char string — the hashed jti lookup is mocked
      const result = await service.refresh("a".repeat(80));

      expect(result.token).toBe("token");
      expect(result.refreshToken).toBeDefined();
      // The consumed token must have been revoked
      expect(mockRefreshTokenRepo.update).toHaveBeenCalledWith(
        { id: "rt-1" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        { revokedAt: expect.any(Date) },
      );
    });

    it("should throw unauthorized if token record is not found", async () => {
      mockRefreshTokenRepo.findOne.mockResolvedValue(undefined);

      await expect(service.refresh("invalid")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("should revoke the entire family and throw on reuse detection", async () => {
      const revokedToken: RefreshToken = {
        ...activeToken,
        revokedAt: new Date(Date.now() - 1000),
      };
      mockRefreshTokenRepo.findOne.mockResolvedValue(revokedToken);

      await expect(service.refresh("reused-token")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      // The family revocation query builder must have been invoked
      expect(mockRefreshTokenRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it("should revoke and throw when token is expired", async () => {
      const expiredToken: RefreshToken = {
        ...activeToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockRefreshTokenRepo.findOne.mockResolvedValue(expiredToken);

      await expect(service.refresh("expired")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(mockRefreshTokenRepo.update).toHaveBeenCalledWith(
        { id: "rt-1" },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        { revokedAt: expect.any(Date) },
      );
    });
  });

  describe("validateUser", () => {
    const user = {
      id: "1",
      username: "u",
      password: "hashed",
      roles: ["user"],
    };

    it("returns user when valid and hash is already at current cost", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      // getRounds returns 12 (default mock) — no re-hash expected.
      expect(await service.validateUser("u", "p")).toEqual(user);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("returns null when invalid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      expect(await service.validateUser("u", "p")).toBeNull();
    });

    it("returns null and runs dummy compare when user not found", async () => {
      repo.findOne.mockResolvedValue(undefined);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.validateUser("nobody", "p");
      expect(result).toBeNull();
      // A compare must still run (timing-oracle mitigation)
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it("re-hashes and persists when stored hash cost is below BCRYPT_ROUNDS", async () => {
      const staleUser = { ...user };
      repo.findOne.mockResolvedValue(staleUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      // Simulate a legacy hash stored at a cost strictly below BCRYPT_ROUNDS.
      // Using 1 is always safely below any reasonable default (4 in test, 12 in prod).
      (bcrypt.getRounds as jest.Mock).mockReturnValueOnce(1);
      (bcrypt.hash as jest.Mock).mockResolvedValue("upgraded-hash");
      repo.save.mockResolvedValue({ ...staleUser, password: "upgraded-hash" });

      const result = await service.validateUser("u", "p");

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      repo.find.mockResolvedValue([{ id: "1" }]);
      expect(await service.findAll()).toEqual([{ id: "1" }]);
    });
  });

  describe("getProfile", () => {
    it("should return the user when found", async () => {
      const user = { id: "1", username: "u", email: "u@test.com" };
      repo.findOne.mockResolvedValue(user);
      const result = await service.getProfile("1");
      expect(result).toEqual(user);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    });

    it("should throw NotFoundException when user not found", async () => {
      repo.findOne.mockResolvedValue(undefined);
      await expect(service.getProfile("nonexistent")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("updateProfile", () => {
    const existingUser = {
      id: "1",
      username: "u",
      email: "u@test.com",
      firstName: null,
      lastName: null,
      gender: null,
    };

    it("should update and return the user on success", async () => {
      repo.findOne.mockResolvedValueOnce(existingUser);
      const updated = {
        ...existingUser,
        firstName: "John",
        lastName: "Doe",
        gender: "male",
      };
      repo.save.mockResolvedValue(updated);

      const dto: UpdateProfileDto = {
        firstName: "John",
        lastName: "Doe",
        gender: GenderEnum.MALE,
      };

      const result = await service.updateProfile("1", dto);
      expect(result).toEqual(updated);
      expect(repo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when user not found", async () => {
      repo.findOne.mockResolvedValue(undefined);
      await expect(
        service.updateProfile("nonexistent", {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw ConflictException when new email is already taken", async () => {
      repo.findOne
        .mockResolvedValueOnce(existingUser) // first call: load the user
        .mockResolvedValueOnce({ id: "2", email: "taken@test.com" }); // second call: email check

      const dto: UpdateProfileDto = { email: "taken@test.com" };
      await expect(service.updateProfile("1", dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("should not check email uniqueness when email is unchanged", async () => {
      repo.findOne.mockResolvedValueOnce(existingUser);
      repo.save.mockResolvedValue(existingUser);

      await service.updateProfile("1", { email: existingUser.email });
      // Only one findOne call — the email uniqueness check is skipped
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("changePassword", () => {
    const user = {
      id: "1",
      username: "u",
      password: "hashed-old",
      tokenVersion: 0,
    };

    it("should change the password and revoke all refresh tokens", async () => {
      repo.findOne.mockResolvedValue({ ...user });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      repo.save.mockResolvedValue({ ...user, password: "NewPass1!" });

      const dto: ChangePasswordDto = {
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
        confirmPassword: "NewPass1!",
      };

      await expect(service.changePassword("1", dto)).resolves.toBeUndefined();
      expect(repo.save).toHaveBeenCalled();
      // All refresh tokens for the user must be revoked
      expect(mockRefreshTokenRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it("should throw NotFoundException when user not found", async () => {
      repo.findOne.mockResolvedValue(undefined);

      const dto: ChangePasswordDto = {
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
        confirmPassword: "NewPass1!",
      };

      await expect(
        service.changePassword("nonexistent", dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("should throw BadRequestException when passwords do not match", async () => {
      const dto: ChangePasswordDto = {
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
        confirmPassword: "DifferentPass1!",
      };

      await expect(service.changePassword("1", dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      // findOne should never be called — validation fails first
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when current password is wrong", async () => {
      repo.findOne.mockResolvedValue({ ...user });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const dto: ChangePasswordDto = {
        currentPassword: "WrongPass1!",
        newPassword: "NewPass1!",
        confirmPassword: "NewPass1!",
      };

      await expect(service.changePassword("1", dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe("generateTokensForUser", () => {
    it("should return user, signed token, and a refresh token", async () => {
      const targetUser: User = {
        id: "u-1",
        username: "alice",
        roles: ["user"],
        tokenVersion: 0,
      } as User;
      mockJwtService.sign.mockReturnValue("access-token");

      const result = await service.generateTokensForUser(targetUser);

      expect(result.user).toBe(targetUser);
      expect(result.token).toBe("access-token");
      expect(typeof result.refreshToken).toBe("string");
      expect(result.refreshToken.length).toBeGreaterThan(0);
    });

    it("should persist the refresh token via the refresh_tokens table", async () => {
      const targetUser: User = {
        id: "u-2",
        username: "bob",
        roles: ["user"],
        tokenVersion: 0,
      } as User;

      await service.generateTokensForUser(targetUser);

      expect(mockRefreshTokenRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
