import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";
import { User } from "../entities/user.entity";

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "user-uuid-1",
    username: "john_doe",
    roles: ["user"],
    suspended: false,
    tokenVersion: 0,
    ...overrides,
  }) as User;

const mockUserRepository = {
  findOne: jest.fn(),
};

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("test-secret") },
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  it("returns minimal user context for a valid payload", async () => {
    mockUserRepository.findOne.mockResolvedValue(
      makeUser({
        id: "user-uuid-1",
        username: "john_doe",
        roles: ["admin", "user"],
        tokenVersion: 0,
      }),
    );

    const result = await strategy.validate({
      sub: "user-uuid-1",
      username: "john_doe",
      roles: ["admin", "user"],
      tokenVersion: 0,
    });

    expect(result).toEqual({
      userId: "user-uuid-1",
      username: "john_doe",
      roles: ["admin", "user"],
    });
  });

  it("handles payload with empty roles", async () => {
    mockUserRepository.findOne.mockResolvedValue(
      makeUser({
        id: "user-uuid-2",
        username: "jane_doe",
        roles: [],
        tokenVersion: 0,
      }),
    );

    const result = await strategy.validate({
      sub: "user-uuid-2",
      username: "jane_doe",
      roles: [],
      tokenVersion: 0,
    });

    expect(result).toEqual({
      userId: "user-uuid-2",
      username: "jane_doe",
      roles: [],
    });
  });

  it("throws UnauthorizedException when user does not exist", async () => {
    mockUserRepository.findOne.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: "gone",
        username: "ghost",
        roles: [],
        tokenVersion: 0,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("throws UnauthorizedException when account is suspended", async () => {
    mockUserRepository.findOne.mockResolvedValue(makeUser({ suspended: true }));

    await expect(
      strategy.validate({
        sub: "user-uuid-1",
        username: "john_doe",
        roles: [],
        tokenVersion: 0,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("throws UnauthorizedException when tokenVersion is stale", async () => {
    mockUserRepository.findOne.mockResolvedValue(makeUser({ tokenVersion: 2 }));

    await expect(
      strategy.validate({
        sub: "user-uuid-1",
        username: "john_doe",
        roles: [],
        tokenVersion: 1, // older version
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when tokenVersion claim is absent (legacy tokens no longer accepted)", async () => {
    mockUserRepository.findOne.mockResolvedValue(makeUser({ tokenVersion: 0 }));

    // Tokens issued before S594 do not carry a tokenVersion claim.
    // After S594 all tokens must carry it; legacy tokens are rejected to
    // prevent indefinite use of pre-hardening credentials.
    await expect(
      strategy.validate({
        sub: "user-uuid-1",
        username: "john_doe",
        roles: ["user"],
        tokenVersion: undefined as unknown as number,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("JwtStrategy — missing secret", () => {
  it("throws when configService returns undefined (no insecure fallback)", async () => {
    // passport-jwt requires a non-empty secret or key. With the hardcoded
    // fallback removed, supplying undefined must result in an error at
    // construction time rather than silently using an insecure default.
    await expect(
      Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
          {
            provide: getRepositoryToken(User),
            useValue: mockUserRepository,
          },
        ],
      }).compile(),
    ).rejects.toThrow();
  });
});
