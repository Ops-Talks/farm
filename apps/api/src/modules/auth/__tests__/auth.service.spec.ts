import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../auth.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
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

// jest will hoist this mock above imports
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("hashed-token"),
}));

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
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
    };
    it("should return user, token, and refreshToken when credentials valid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      const loginDto: LoginDto = { username: "u", password: "p" };
      const result = await service.login(loginDto);
      expect(result.user).toEqual(user);
      expect(result.token).toBe("token");
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.refreshToken).toBe("string");
      expect(repo.update).toHaveBeenCalledWith("1", {
        refreshToken: "hashed-token",
      });
    });

    it("should throw unauthorized if user not found", async () => {
      repo.findOne.mockResolvedValue(undefined);
      await expect(
        service.login({ username: "x", password: "p" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should throw unauthorized if password invalid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);
      await expect(
        service.login({ username: "u", password: "p" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    const user = {
      id: "1",
      username: "u",
      password: "hashed",
      roles: ["user"],
      refreshToken: "hashed-refresh",
    };

    it("should return new token and rotated refreshToken", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);

      const result = await service.refresh("u", "valid-refresh-token");

      expect(result.token).toBe("token");
      expect(result.refreshToken).toBeDefined();
      expect(repo.update).toHaveBeenCalledWith("1", {
        refreshToken: "hashed-token",
      });
    });

    it("should throw unauthorized if user not found", async () => {
      repo.findOne.mockResolvedValue(undefined);

      await expect(
        service.refresh("nonexistent", "some-token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should throw unauthorized if user has no refresh token", async () => {
      repo.findOne.mockResolvedValue({
        ...user,
        refreshToken: null,
      });

      await expect(service.refresh("u", "some-token")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("should invalidate refresh token on reuse attempt", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

      await expect(
        service.refresh("u", "invalid-token"),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // Should clear the stored refresh token (possible replay attack)
      expect(repo.update).toHaveBeenCalledWith("1", {
        refreshToken: undefined,
      });
    });
  });

  describe("validateUser", () => {
    const user = {
      id: "1",
      username: "u",
      password: "hashed",
      roles: ["user"],
    };
    it("returns user when valid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      expect(await service.validateUser("u", "p")).toEqual(user);
    });

    it("returns null when invalid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);
      expect(await service.validateUser("u", "p")).toBeNull();
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
      refreshToken: "some-token",
    };

    it("should change the password and clear the refresh token", async () => {
      repo.findOne.mockResolvedValue({ ...user });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);
      repo.save.mockResolvedValue({
        ...user,
        password: "NewPass1!",
        refreshToken: null,
      });

      const dto: ChangePasswordDto = {
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
        confirmPassword: "NewPass1!",
      };

      await expect(service.changePassword("1", dto)).resolves.toBeUndefined();
      expect(repo.save).toHaveBeenCalled();
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
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

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
      } as User;
      repo.update.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue("access-token");

      const result = await service.generateTokensForUser(targetUser);

      expect(result.user).toBe(targetUser);
      expect(result.token).toBe("access-token");
      expect(typeof result.refreshToken).toBe("string");
      expect(result.refreshToken.length).toBeGreaterThan(0);
    });

    it("should persist hashed refresh token via userRepository.update", async () => {
      const targetUser: User = {
        id: "u-2",
        username: "bob",
        roles: ["user"],
      } as User;
      repo.update.mockResolvedValue(undefined);

      await service.generateTokensForUser(targetUser);

      expect(repo.update).toHaveBeenCalled();
      const lastId = (repo.update.mock.calls as [[string, object]])[0][0];
      expect(lastId).toBe("u-2");
    });
  });
});
