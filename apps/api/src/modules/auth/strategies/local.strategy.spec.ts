import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { LocalStrategy } from "./local.strategy";
import { AuthService } from "../auth.service";
import { User } from "../entities/user.entity";

describe("LocalStrategy", () => {
  let strategy: LocalStrategy;
  let authService: AuthService;

  const mockUser = {
    id: "user-uuid-1",
    username: "john_doe",
    email: "john@example.com",
    displayName: "John Doe",
    roles: ["user"],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  it("should return user when credentials are valid", async () => {
    jest.spyOn(authService, "validateUser").mockResolvedValue(mockUser);

    const result = (await strategy.validate("john_doe", "password123")) as User;

    expect(result).toEqual(mockUser);
    expect(authService.validateUser).toHaveBeenCalledWith(
      "john_doe",
      "password123",
    );
  });

  it("should throw UnauthorizedException when credentials are invalid", async () => {
    jest.spyOn(authService, "validateUser").mockResolvedValue(null);

    await expect(
      strategy.validate("john_doe", "wrong_password"),
    ).rejects.toThrow(UnauthorizedException);
  });
});
