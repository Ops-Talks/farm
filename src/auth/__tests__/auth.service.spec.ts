import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../auth.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { RegisterUserDto } from "../dto/register-user.dto";
import { LoginDto } from "../dto/login.dto";

// jest will hoist this mock above imports
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
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
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    // only reset repository mocks; keep jwtService return value intact
    jest.resetAllMocks();
    mockJwtService.sign.mockReturnValue("token");
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
    it("should return user and token when credentials valid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as any);
      const loginDto: LoginDto = { username: "u", password: "p" };
      const result = await service.login(loginDto);
      expect(result.user).toEqual(user);
      expect(result.token).toBe("token");
    });

    it("should throw unauthorized if user not found", async () => {
      repo.findOne.mockResolvedValue(undefined);
      await expect(
        service.login({ username: "x", password: "p" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("should throw unauthorized if password invalid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as any);
      await expect(
        service.login({ username: "u", password: "p" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
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
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as any);
      expect(await service.validateUser("u", "p")).toEqual(user);
    });

    it("returns null when invalid", async () => {
      repo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as any);
      expect(await service.validateUser("u", "p")).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      repo.find.mockResolvedValue([{ id: "1" }]);
      expect(await service.findAll()).toEqual([{ id: "1" }]);
    });
  });
});
