import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SetupService } from "./setup.service";
import { KubernetesService } from "../kubernetes/kubernetes.service";
import { RegistryService } from "../registry/registry.service";
import { Component } from "../catalog/entities/component.entity";
import { Team } from "../teams/entities/team.entity";
import { IntegrationCredential } from "../integrations/entities/integration-credential.entity";
import { Organization } from "../organization/entities/organization.entity";

describe("SetupService", () => {
  let service: SetupService;

  const mockKubernetesService = { isEnabled: jest.fn() };
  const mockRegistryService = { adapterType: null as string | null };
  const mockComponentRepo = { count: jest.fn() };
  const mockTeamRepo = { count: jest.fn() };
  const mockCredRepo = { count: jest.fn() };
  const mockOrgRepo = { findOne: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default setup: nothing configured, no entities
    mockKubernetesService.isEnabled.mockReturnValue(false);
    mockRegistryService.adapterType = null;
    mockComponentRepo.count.mockResolvedValue(0);
    mockTeamRepo.count.mockResolvedValue(0);
    mockCredRepo.count.mockResolvedValue(0);
    mockOrgRepo.findOne.mockResolvedValue(null);
    mockOrgRepo.save.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupService,
        { provide: KubernetesService, useValue: mockKubernetesService },
        { provide: RegistryService, useValue: mockRegistryService },
        {
          provide: getRepositoryToken(Component),
          useValue: mockComponentRepo,
        },
        { provide: getRepositoryToken(Team), useValue: mockTeamRepo },
        {
          provide: getRepositoryToken(IntegrationCredential),
          useValue: mockCredRepo,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrgRepo,
        },
      ],
    }).compile();

    service = module.get<SetupService>(SetupService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getChecklist()", () => {
    it("returns exactly 5 checklist items", async () => {
      const items = await service.getChecklist();
      expect(items).toHaveLength(5);
    });

    it("marks setup-kubernetes as completed when Kubernetes is enabled", async () => {
      mockKubernetesService.isEnabled.mockReturnValue(true);
      const items = await service.getChecklist();
      const k8s = items.find((i) => i.key === "setup-kubernetes");
      expect(k8s?.completed).toBe(true);
    });

    it("marks setup-registry as completed when registry adapter is configured", async () => {
      mockRegistryService.adapterType = "ecr";
      const items = await service.getChecklist();
      const reg = items.find((i) => i.key === "setup-registry");
      expect(reg?.completed).toBe(true);
    });

    it("marks create-component as completed when components exist", async () => {
      mockComponentRepo.count.mockResolvedValue(3);
      const items = await service.getChecklist();
      const comp = items.find((i) => i.key === "create-component");
      expect(comp?.completed).toBe(true);
    });

    it("marks create-team as completed when teams exist", async () => {
      mockTeamRepo.count.mockResolvedValue(1);
      const items = await service.getChecklist();
      const team = items.find((i) => i.key === "create-team");
      expect(team?.completed).toBe(true);
    });

    it("marks configure-integrations as completed when credentials exist", async () => {
      mockCredRepo.count.mockResolvedValue(2);
      const items = await service.getChecklist();
      const cred = items.find((i) => i.key === "configure-integrations");
      expect(cred?.completed).toBe(true);
    });

    it("marks items as dismissed based on org settings", async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: "org-1",
        settings: { dismissedChecklist: ["setup-kubernetes", "create-team"] },
      });
      const items = await service.getChecklist("org-1");
      const k8s = items.find((i) => i.key === "setup-kubernetes");
      const team = items.find((i) => i.key === "create-team");
      const reg = items.find((i) => i.key === "setup-registry");
      expect(k8s?.dismissed).toBe(true);
      expect(team?.dismissed).toBe(true);
      expect(reg?.dismissed).toBe(false);
    });

    it("returns dismissed: false for all items when org has no settings", async () => {
      mockOrgRepo.findOne.mockResolvedValue({ id: "org-1", settings: null });
      const items = await service.getChecklist("org-1");
      expect(items.every((i) => i.dismissed === false)).toBe(true);
    });
  });

  describe("dismissItem()", () => {
    it("does nothing when orgId is not provided", async () => {
      await service.dismissItem(undefined, "setup-kubernetes");
      expect(mockOrgRepo.findOne).not.toHaveBeenCalled();
    });

    it("does nothing for invalid checklist keys", async () => {
      await service.dismissItem("org-1", "invalid-key");
      expect(mockOrgRepo.findOne).not.toHaveBeenCalled();
    });

    it("saves the dismissed key to org settings", async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: "org-1",
        settings: null,
      });
      await service.dismissItem("org-1", "setup-kubernetes");
      expect(mockOrgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            dismissedChecklist: ["setup-kubernetes"],
          }) as unknown,
        }),
      );
    });

    it("appends to existing dismissed list", async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: "org-1",
        settings: { dismissedChecklist: ["setup-registry"] },
      });
      await service.dismissItem("org-1", "create-component");
      expect(mockOrgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            dismissedChecklist: ["setup-registry", "create-component"],
          }) as unknown,
        }),
      );
    });

    it("does not duplicate already dismissed items", async () => {
      mockOrgRepo.findOne.mockResolvedValue({
        id: "org-1",
        settings: { dismissedChecklist: ["setup-kubernetes"] },
      });
      await service.dismissItem("org-1", "setup-kubernetes");
      expect(mockOrgRepo.save).not.toHaveBeenCalled();
    });

    it("does nothing when org is not found", async () => {
      mockOrgRepo.findOne.mockResolvedValue(null);
      await service.dismissItem("org-unknown", "setup-kubernetes");
      expect(mockOrgRepo.save).not.toHaveBeenCalled();
    });
  });
});
