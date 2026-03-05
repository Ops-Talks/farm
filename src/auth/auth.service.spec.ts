import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { User } from "./entities/user.entity";

describe("AuthService", () => {
  let service: AuthService;

  const mockUser: User = {
    id: "uuid",
    username: "john",
    email: "john@example.com",
    displayName: "John",
    password: "password",
    roles: ["user"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto: any) => dto as User),
    save: jest.fn().mockImplementation((user: User) =>
      Promise.resolve({
        id: "uuid",
        ...user,
      } as User),
    ),
    find: jest.fn().mockResolvedValue([mockUser]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("should register a user", async () => {
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
    it("should login with valid credentials", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      const result = await service.login({
        username: "john",
        password: "password",
      });
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBeDefined();
    });

    it("should throw UnauthorizedException for invalid password", async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      await expect(
        service.login({ username: "john", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
