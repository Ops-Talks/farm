import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { AuthController } from "../auth.controller";
import { AuthService } from "../auth.service";
import { KeycloakOidcService } from "../keycloak-oidc.service";
import { QUEUE_NAMES } from "../../../common/queues/queue-names";
import { RegisterUserDto } from "../dto/register-user.dto";
import { LoginDto } from "../dto/login.dto";

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  findAll: jest.fn(),
};

const mockKeycloakOidcService = {
  getStrategyForOrg: jest.fn(),
};

const mockKeycloakSyncQueue = {
  add: jest.fn(),
};

describe("AuthController", () => {
  let controller: AuthController;
  let service: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: KeycloakOidcService,
          useValue: mockKeycloakOidcService,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.KEYCLOAK_SYNC),
          useValue: mockKeycloakSyncQueue,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("register should return user", async () => {
    const dto: RegisterUserDto = {
      username: "u",
      email: "e",
      password: "p",
      displayName: "u",
    };
    service.register.mockResolvedValue({ id: "1", ...dto });
    expect(await controller.register(dto)).toEqual({ id: "1", ...dto });
  });

  it("login should return token and user", async () => {
    const dto: LoginDto = { username: "u", password: "p" };
    const result = {
      user: { id: "1" },
      token: "t",
      refreshToken: "rt",
    };
    service.login.mockResolvedValue(result);
    expect(await controller.login(dto)).toEqual(result);
  });

  it("findAll should return users", async () => {
    service.findAll.mockResolvedValue([{ id: "1" }]);
    expect(await controller.findAll()).toEqual([{ id: "1" }]);
  });
});
