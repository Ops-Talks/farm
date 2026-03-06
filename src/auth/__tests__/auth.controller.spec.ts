import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "../auth.controller";
import { AuthService } from "../auth.service";
import { RegisterUserDto } from "../dto/register-user.dto";
import { LoginDto } from "../dto/login.dto";

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  findAll: jest.fn(),
};

describe("AuthController", () => {
  let controller: AuthController;
  let service: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
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
    service.login.mockResolvedValue({ user: { id: "1" }, token: "t" });
    expect(await controller.login(dto)).toEqual({
      user: { id: "1" },
      token: "t",
    });
  });

  it("findAll should return users", async () => {
    service.findAll.mockResolvedValue([{ id: "1" }]);
    expect(await controller.findAll()).toEqual([{ id: "1" }]);
  });
});
