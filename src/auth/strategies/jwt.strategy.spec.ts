import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("test-secret"),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  it("should extract user info from JWT payload", () => {
    const payload = {
      sub: "user-uuid-1",
      username: "john_doe",
      roles: ["admin", "user"],
    };

    const result = strategy.validate(payload);

    expect(result).toEqual({
      userId: "user-uuid-1",
      username: "john_doe",
      roles: ["admin", "user"],
    });
  });

  it("should handle payload with empty roles", () => {
    const payload = {
      sub: "user-uuid-2",
      username: "jane_doe",
      roles: [],
    };

    const result = strategy.validate(payload);

    expect(result).toEqual({
      userId: "user-uuid-2",
      username: "jane_doe",
      roles: [],
    });
  });
});
