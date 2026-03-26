import { Test, TestingModule } from "@nestjs/testing";
import { ArgoCDController } from "./argocd.controller";
import { ArgoCDService } from "./argocd.service";

describe("ArgoCDController", () => {
  let controller: ArgoCDController;
  let argoCDService: {
    listApplications: jest.Mock;
    getApplication: jest.Mock;
    syncApplication: jest.Mock;
  };

  const mockApp = {
    name: "my-app",
    namespace: "argocd",
    status: "Synced",
    health: "Healthy",
    syncStatus: "Synced",
  };
  const mockRequest = { organizationId: "org-uuid-1" };

  beforeEach(async () => {
    argoCDService = {
      listApplications: jest.fn().mockResolvedValue([mockApp]),
      getApplication: jest.fn().mockResolvedValue(mockApp),
      syncApplication: jest.fn().mockResolvedValue({ operation: {} }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArgoCDController],
      providers: [{ provide: ArgoCDService, useValue: argoCDService }],
    }).compile();

    controller = module.get<ArgoCDController>(ArgoCDController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listApplications", () => {
    it("should list applications using orgId from request", async () => {
      const result = await controller.listApplications(
        undefined,
        mockRequest as never,
      );
      expect(result).toEqual([mockApp]);
      expect(argoCDService.listApplications).toHaveBeenCalledWith("org-uuid-1");
    });

    it("should use explicit orgId over request org", async () => {
      await controller.listApplications("explicit-org", mockRequest as never);
      expect(argoCDService.listApplications).toHaveBeenCalledWith(
        "explicit-org",
      );
    });

    it("should fall back to empty string when neither orgId nor request exist", async () => {
      await controller.listApplications(undefined, undefined);
      expect(argoCDService.listApplications).toHaveBeenCalledWith("");
    });
  });

  describe("getApplication", () => {
    it("should return an application by name using request org", async () => {
      const result = await controller.getApplication(
        "my-app",
        undefined,
        mockRequest as never,
      );
      expect(result).toEqual(mockApp);
      expect(argoCDService.getApplication).toHaveBeenCalledWith(
        "org-uuid-1",
        "my-app",
      );
    });

    it("should use explicit orgId when provided", async () => {
      await controller.getApplication("my-app", "org-2", mockRequest as never);
      expect(argoCDService.getApplication).toHaveBeenCalledWith(
        "org-2",
        "my-app",
      );
    });

    it("should fall back to empty string when neither orgId nor request exist", async () => {
      await controller.getApplication("my-app", undefined, undefined);
      expect(argoCDService.getApplication).toHaveBeenCalledWith("", "my-app");
    });
  });

  describe("syncApplication", () => {
    it("should sync application using request org", async () => {
      const result = await controller.syncApplication(
        "my-app",
        undefined,
        mockRequest as never,
      );
      expect(result).toEqual({ operation: {} });
      expect(argoCDService.syncApplication).toHaveBeenCalledWith(
        "org-uuid-1",
        "my-app",
      );
    });

    it("should use explicit orgId over request org", async () => {
      await controller.syncApplication(
        "my-app",
        "explicit-org",
        mockRequest as never,
      );
      expect(argoCDService.syncApplication).toHaveBeenCalledWith(
        "explicit-org",
        "my-app",
      );
    });

    it("should fall back to empty string when neither orgId nor request exist", async () => {
      await controller.syncApplication("my-app", undefined, undefined);
      expect(argoCDService.syncApplication).toHaveBeenCalledWith("", "my-app");
    });
  });
});
