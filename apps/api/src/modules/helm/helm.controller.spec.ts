import { Test, TestingModule } from "@nestjs/testing";
import { HelmController } from "./helm.controller";
import { HelmService } from "./helm.service";
import { KubernetesService } from "../kubernetes/kubernetes.service";
import { HelmRelease } from "./helm-release.interface";

const mockReleases: HelmRelease[] = [
  {
    name: "my-app",
    namespace: "production",
    chart: "my-chart",
    chartVersion: "1.2.3",
    appVersion: "2.0.0",
    status: "deployed",
    revision: 3,
    updatedAt: "2024-01-15T10:00:00Z",
  },
];

describe("HelmController", () => {
  let controller: HelmController;
  let helmService: jest.Mocked<HelmService>;
  let kubernetesService: jest.Mocked<Pick<KubernetesService, "isEnabled">>;

  beforeEach(async () => {
    const mockHelmService: Partial<jest.Mocked<HelmService>> = {
      listReleases: jest.fn().mockResolvedValue(mockReleases),
      syncReleases: jest.fn().mockResolvedValue({ synced: 1, errors: [] }),
    };

    kubernetesService = { isEnabled: jest.fn().mockReturnValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelmController],
      providers: [
        { provide: HelmService, useValue: mockHelmService },
        { provide: KubernetesService, useValue: kubernetesService },
      ],
    }).compile();

    controller = module.get<HelmController>(HelmController);
    helmService = module.get(HelmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listReleases", () => {
    it("should return releases from HelmService", async () => {
      const result = await controller.listReleases();
      expect(helmService.listReleases).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockReleases);
    });

    it("should pass namespace query parameter to HelmService", async () => {
      await controller.listReleases("staging");
      expect(helmService.listReleases).toHaveBeenCalledWith("staging");
    });

    it("should return empty array when no releases exist", async () => {
      helmService.listReleases.mockResolvedValue([]);
      const result = await controller.listReleases();
      expect(result).toEqual([]);
    });
  });

  describe("syncReleases", () => {
    it("should call syncReleases and return result", async () => {
      const result = await controller.syncReleases();
      expect(helmService.syncReleases).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ synced: 1, errors: [] });
    });

    it("should pass namespace param to syncReleases", async () => {
      await controller.syncReleases("production");
      expect(helmService.syncReleases).toHaveBeenCalledWith("production");
    });

    it("should return errors from failed syncs", async () => {
      helmService.syncReleases.mockResolvedValue({
        synced: 0,
        errors: ["production/my-app: component not found"],
      });
      const result = await controller.syncReleases();
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("getAvailability", () => {
    it("returns available: true when Kubernetes is enabled", () => {
      kubernetesService.isEnabled.mockReturnValue(true);
      const result = controller.getAvailability();
      expect(result).toEqual({ available: true });
    });

    it("returns available: false with reason when Kubernetes is not enabled", () => {
      kubernetesService.isEnabled.mockReturnValue(false);
      const result = controller.getAvailability();
      expect(result).toEqual({
        available: false,
        reason: "KUBECONFIG not set or cluster unreachable",
      });
    });
  });
});
