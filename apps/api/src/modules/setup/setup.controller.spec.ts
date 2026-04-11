import { Test, TestingModule } from "@nestjs/testing";
import { SetupController } from "./setup.controller";
import { SetupService, SetupChecklistItem } from "./setup.service";

describe("SetupController", () => {
  let controller: SetupController;
  let setupService: jest.Mocked<
    Pick<SetupService, "getChecklist" | "dismissItem">
  >;

  const mockChecklist: SetupChecklistItem[] = [
    {
      key: "setup-kubernetes",
      title: "Connect a Kubernetes cluster",
      description: "Configure KUBECONFIG...",
      href: "/kubernetes",
      completed: false,
      dismissed: false,
    },
    {
      key: "setup-registry",
      title: "Configure a container registry",
      description: "Set REGISTRY_TYPE...",
      href: "/integrations/settings",
      completed: false,
      dismissed: false,
    },
    {
      key: "create-component",
      title: "Register your first component",
      description: "Add a service...",
      href: "/catalog",
      completed: true,
      dismissed: false,
    },
    {
      key: "create-team",
      title: "Create a team",
      description: "Group users...",
      href: "/teams",
      completed: false,
      dismissed: true,
    },
    {
      key: "configure-integrations",
      title: "Set up a CI/CD integration",
      description: "Connect ArgoCD...",
      href: "/integrations/settings",
      completed: false,
      dismissed: false,
    },
  ];

  beforeEach(async () => {
    setupService = {
      getChecklist: jest.fn().mockResolvedValue(mockChecklist),
      dismissItem: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetupController],
      providers: [{ provide: SetupService, useValue: setupService }],
    }).compile();

    controller = module.get<SetupController>(SetupController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getChecklist()", () => {
    it("returns checklist items from SetupService", async () => {
      const mockReq = { organizationId: "org-1" } as unknown as Request;
      const result = await controller.getChecklist(mockReq);
      expect(setupService.getChecklist).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(mockChecklist);
    });

    it("passes undefined orgId when request has no organizationId", async () => {
      const mockReq = {} as unknown as Request;
      await controller.getChecklist(mockReq);
      expect(setupService.getChecklist).toHaveBeenCalledWith(undefined);
    });

    it("returns 5 items", async () => {
      const mockReq = {} as unknown as Request;
      const result = await controller.getChecklist(mockReq);
      expect(result).toHaveLength(5);
    });
  });

  describe("dismissItem()", () => {
    it("calls dismissItem and returns { dismissed: true }", async () => {
      const mockReq = { organizationId: "org-1" } as unknown as Request;
      const result = await controller.dismissItem("setup-kubernetes", mockReq);
      expect(setupService.dismissItem).toHaveBeenCalledWith(
        "org-1",
        "setup-kubernetes",
      );
      expect(result).toEqual({ dismissed: true });
    });

    it("passes undefined orgId when request has no organizationId", async () => {
      const mockReq = {} as unknown as Request;
      await controller.dismissItem("create-team", mockReq);
      expect(setupService.dismissItem).toHaveBeenCalledWith(
        undefined,
        "create-team",
      );
    });
  });

  describe("direct instantiation", () => {
    it("covers the V8-instrumented constructor parameter branch artifact", () => {
      // Passing undefined covers the 'falsy' branch of the TypeScript-compiled
      // constructor parameter property assignment that Istanbul instruments.
      const ctrl = new SetupController(undefined as unknown as SetupService);
      expect(ctrl).toBeDefined();
    });
  });
});
