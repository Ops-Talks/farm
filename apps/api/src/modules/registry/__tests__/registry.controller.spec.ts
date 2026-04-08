import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { RegistryController } from "../registry.controller";
import { RegistryService } from "../registry.service";
import { VulnerabilityService } from "../vulnerability.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { getQueueToken } from "@nestjs/bullmq";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  RepositoryDto,
  TagDto,
  ManifestDto,
  ScanResultDto,
  HarborReplicationPolicy,
} from "../interfaces/registry-adapter.interface";
import { ContainerVulnerability } from "../entities/container-vulnerability.entity";
import { VulnerabilitySeverity } from "../enums/vulnerability-severity.enum";
import { VULNERABILITY_SYNC_QUEUE } from "../processors/vulnerability-sync.processor";
import { Component } from "../../catalog/entities/component.entity";

const mockRepositories: RepositoryDto[] = [
  { name: "my-app", uri: "123.dkr.ecr.us-east-1.amazonaws.com/my-app" },
];

const mockTags: TagDto[] = [{ tag: "latest", digest: "sha256:abc" }];

const mockManifest: ManifestDto = {
  digest: "sha256:abc",
  mediaType: "application/vnd.oci.image.manifest.v1+json",
  tags: ["latest"],
};

const mockScanResult: ScanResultDto = {
  status: "COMPLETE",
  vulnerabilities: [],
};

describe("RegistryController", () => {
  let controller: RegistryController;

  const mockRegistryService = {
    listRepositories: jest.fn().mockResolvedValue(mockRepositories),
    listTags: jest.fn().mockResolvedValue(mockTags),
    getManifest: jest.fn().mockResolvedValue(mockManifest),
    getScanResults: jest.fn().mockResolvedValue(mockScanResult),
  };

  const mockVulnService = {
    findByComponent: jest.fn().mockResolvedValue([]),
    getSummary: jest.fn().mockResolvedValue({
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
      total: 0,
    }),
    syncForComponent: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistryController],
      providers: [
        { provide: RegistryService, useValue: mockRegistryService },
        { provide: VulnerabilityService, useValue: mockVulnService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RegistryController>(RegistryController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listRepositories()", () => {
    it("should return repositories from service", async () => {
      const result = await controller.listRepositories();

      expect(mockRegistryService.listRepositories).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRepositories);
    });
  });

  describe("listTags()", () => {
    it("should return tags from service", async () => {
      const result = await controller.listTags("my-app");

      expect(mockRegistryService.listTags).toHaveBeenCalledWith("my-app");
      expect(result).toEqual(mockTags);
    });
  });

  describe("getManifest()", () => {
    it("should return manifest from service", async () => {
      const result = await controller.getManifest("my-app", "latest");

      expect(mockRegistryService.getManifest).toHaveBeenCalledWith(
        "my-app",
        "latest",
      );
      expect(result).toEqual(mockManifest);
    });
  });

  describe("getScanResults()", () => {
    it("should return scan results from service", async () => {
      const result = await controller.getScanResults("my-app", "latest");

      expect(mockRegistryService.getScanResults).toHaveBeenCalledWith(
        "my-app",
        "latest",
      );
      expect(result).toEqual(mockScanResult);
    });
  });
});

// ---------------------------------------------------------------------------
// Additional branch coverage: harbor replications, vulnerability endpoints
// ---------------------------------------------------------------------------

const mockPolicies: HarborReplicationPolicy[] = [
  {
    id: 1,
    name: "push-to-ecr",
    srcRegistry: "local",
    destRegistry: "ecr",
    filters: [],
    triggerType: "scheduled",
    enabled: true,
    lastExecutionStatus: "succeed",
  },
];

const mockVulnerability = {
  id: "vuln-1",
  cveId: "CVE-2023-001",
  severity: VulnerabilitySeverity.HIGH,
  packageName: "openssl",
  installedVersion: "1.1.1",
  componentId: "comp-1",
} as ContainerVulnerability;

const mockComponent = {
  id: "comp-1",
  name: "my-service",
  containerImage: { image: "my-service", latestTag: "v1.0", registry: "ecr" },
} as unknown as Component;

describe("RegistryController — additional endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  async function buildController(
    opts: {
      withVulnService?: boolean;
      withQueue?: boolean;
      withComponentRepo?: boolean;
      componentRepoResult?: Component | null;
    } = {},
  ) {
    const {
      withVulnService = true,
      withQueue = false,
      withComponentRepo = true,
      componentRepoResult = mockComponent,
    } = opts;

    const mockRegistryService = {
      listRepositories: jest.fn().mockResolvedValue([]),
      listTags: jest.fn().mockResolvedValue([]),
      getManifest: jest.fn().mockResolvedValue({}),
      getScanResults: jest
        .fn()
        .mockResolvedValue({ status: "COMPLETE", vulnerabilities: [] }),
      listHarborReplications: jest.fn().mockResolvedValue(mockPolicies),
    };

    const mockVulnSvc = withVulnService
      ? {
          findByComponent: jest.fn().mockResolvedValue([mockVulnerability]),
          getSummary: jest.fn().mockResolvedValue({
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
            informational: 0,
            total: 1,
          }),
          syncForComponent: jest.fn().mockResolvedValue([mockVulnerability]),
        }
      : null;

    const mockQueue = withQueue
      ? { add: jest.fn().mockResolvedValue({}) }
      : null;

    const mockRepo = withComponentRepo
      ? { findOne: jest.fn().mockResolvedValue(componentRepoResult) }
      : null;

    const providers: object[] = [
      { provide: RegistryService, useValue: mockRegistryService },
    ];

    if (withVulnService && mockVulnSvc) {
      providers.push({ provide: VulnerabilityService, useValue: mockVulnSvc });
    }
    if (withQueue) {
      providers.push({
        provide: getQueueToken(VULNERABILITY_SYNC_QUEUE),
        useValue: mockQueue,
      });
    }
    if (withComponentRepo && mockRepo) {
      providers.push({
        provide: getRepositoryToken(Component),
        useValue: mockRepo,
      });
    }

    const module = await Test.createTestingModule({
      controllers: [RegistryController],
      providers,
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    return {
      controller: module.get<RegistryController>(RegistryController),
      mockRegistryService,
      mockVulnSvc,
      mockQueue,
      mockRepo,
    };
  }

  describe("listHarborReplications()", () => {
    it("delegates to registryService.listHarborReplications()", async () => {
      const { controller, mockRegistryService } = await buildController();

      const result = await controller.listHarborReplications();

      expect(mockRegistryService.listHarborReplications).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toEqual(mockPolicies);
    });
  });

  describe("listVulnerabilities()", () => {
    it("returns vulnerabilities from service", async () => {
      const { controller } = await buildController();

      const result = await controller.listVulnerabilities("comp-1");

      expect(result).toEqual([mockVulnerability]);
    });

    it("filters by severity when provided", async () => {
      const { controller, mockVulnSvc } = await buildController();

      await controller.listVulnerabilities(
        "comp-1",
        VulnerabilitySeverity.HIGH,
      );

      expect(mockVulnSvc!.findByComponent).toHaveBeenCalledWith(
        "comp-1",
        VulnerabilitySeverity.HIGH,
      );
    });

    it("throws ServiceUnavailableException when vulnService is absent", async () => {
      const { controller } = await buildController({ withVulnService: false });

      await expect(controller.listVulnerabilities("comp-1")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe("getVulnerabilitySummary()", () => {
    it("returns summary from service", async () => {
      const { controller } = await buildController();

      const result = await controller.getVulnerabilitySummary("comp-1");

      expect(result).toMatchObject({ high: 1 });
    });

    it("throws ServiceUnavailableException when vulnService is absent", async () => {
      const { controller } = await buildController({ withVulnService: false });

      await expect(
        controller.getVulnerabilitySummary("comp-1"),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe("syncVulnerabilities()", () => {
    it("throws ServiceUnavailableException when componentRepo is absent", async () => {
      const { controller } = await buildController({
        withComponentRepo: false,
      });

      await expect(controller.syncVulnerabilities("comp-1")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("throws ServiceUnavailableException when vulnService is absent", async () => {
      const { controller } = await buildController({ withVulnService: false });

      await expect(controller.syncVulnerabilities("comp-1")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("throws NotFoundException when component is not found", async () => {
      const { controller } = await buildController({
        componentRepoResult: null,
      });

      await expect(
        controller.syncVulnerabilities("comp-missing"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when component has no containerImage", async () => {
      const noImageComponent = {
        ...mockComponent,
        containerImage: null,
      } as unknown as Component;
      const { controller } = await buildController({
        componentRepoResult: noImageComponent,
      });

      await expect(controller.syncVulnerabilities("comp-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("enqueues job and returns queued:true when queue is available", async () => {
      const { controller, mockQueue } = await buildController({
        withQueue: true,
      });

      const result = await controller.syncVulnerabilities("comp-1");

      expect(mockQueue!.add).toHaveBeenCalledWith(
        "sync",
        expect.objectContaining({ componentId: "comp-1" }),
        expect.any(Object),
      );
      expect(result).toEqual({ queued: true });
    });

    it("runs inline sync and returns queued:false when queue is absent", async () => {
      const { controller, mockVulnSvc } = await buildController({
        withQueue: false,
      });

      const result = await controller.syncVulnerabilities("comp-1");

      expect(mockVulnSvc!.syncForComponent).toHaveBeenCalledWith(
        "comp-1",
        "my-service",
        "my-service",
        "v1.0",
        "ecr",
      );
      expect(result).toEqual({ queued: false, count: 1 });
    });
  });
});
