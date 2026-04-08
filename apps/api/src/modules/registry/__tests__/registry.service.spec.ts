import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnavailableException } from "@nestjs/common";
import { RegistryService } from "../registry.service";
import { REGISTRY_ADAPTER } from "../registry.constants";
import { RegistryType } from "../enums/registry-type.enum";
import {
  IRegistryAdapter,
  RepositoryDto,
  TagDto,
  ManifestDto,
  ScanResultDto,
  HarborReplicationPolicy,
} from "../interfaces/registry-adapter.interface";

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

const mockAdapter: IRegistryAdapter = {
  type: RegistryType.ECR,
  listRepositories: jest.fn().mockResolvedValue(mockRepositories),
  listTags: jest.fn().mockResolvedValue(mockTags),
  getManifest: jest.fn().mockResolvedValue(mockManifest),
  getScanResults: jest.fn().mockResolvedValue(mockScanResult),
};

describe("RegistryService", () => {
  let service: RegistryService;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("with a configured adapter", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RegistryService,
          { provide: REGISTRY_ADAPTER, useValue: mockAdapter },
        ],
      }).compile();

      service = module.get<RegistryService>(RegistryService);
    });

    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("listRepositories() delegates to adapter", async () => {
      const result = await service.listRepositories();

      expect(mockAdapter.listRepositories).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRepositories);
    });

    it("listTags() delegates to adapter", async () => {
      const result = await service.listTags("my-app");

      expect(mockAdapter.listTags).toHaveBeenCalledWith("my-app");
      expect(result).toEqual(mockTags);
    });

    it("getManifest() delegates to adapter", async () => {
      const result = await service.getManifest("my-app", "latest");

      expect(mockAdapter.getManifest).toHaveBeenCalledWith("my-app", "latest");
      expect(result).toEqual(mockManifest);
    });

    it("getScanResults() delegates to adapter", async () => {
      const result = await service.getScanResults("my-app", "latest");

      expect(mockAdapter.getScanResults).toHaveBeenCalledWith(
        "my-app",
        "latest",
      );
      expect(result).toEqual(mockScanResult);
    });
  });

  describe("with no adapter configured (null)", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RegistryService,
          { provide: REGISTRY_ADAPTER, useValue: null },
        ],
      }).compile();

      service = module.get<RegistryService>(RegistryService);
    });

    it("listRepositories() throws ServiceUnavailableException", async () => {
      await expect(service.listRepositories()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("listTags() throws ServiceUnavailableException", async () => {
      await expect(service.listTags("my-app")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("getManifest() throws ServiceUnavailableException", async () => {
      await expect(service.getManifest("my-app", "latest")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it("getScanResults() throws ServiceUnavailableException", async () => {
      await expect(service.getScanResults("my-app", "latest")).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// normalizeImage branch coverage
// ---------------------------------------------------------------------------

function buildServiceWithAdapter(
  adapter: IRegistryAdapter | null,
): Promise<RegistryService> {
  return Test.createTestingModule({
    providers: [
      RegistryService,
      { provide: REGISTRY_ADAPTER, useValue: adapter },
    ],
  })
    .compile()
    .then((m) => m.get<RegistryService>(RegistryService));
}

function makeAdapter(
  type: RegistryType,
  overrides: Partial<IRegistryAdapter> = {},
): IRegistryAdapter {
  return {
    type,
    listRepositories: jest.fn().mockResolvedValue([]),
    listTags: jest.fn().mockResolvedValue([]),
    getManifest: jest.fn().mockResolvedValue({}),
    getScanResults: jest
      .fn()
      .mockResolvedValue({ status: "COMPLETE", vulnerabilities: [] }),
    ...overrides,
  };
}

describe("RegistryService — normalizeImage branches", () => {
  afterEach(() => jest.clearAllMocks());

  describe("ECR adapter", () => {
    let service: RegistryService;
    let adapter: IRegistryAdapter;

    beforeEach(async () => {
      adapter = makeAdapter(RegistryType.ECR);
      service = await buildServiceWithAdapter(adapter);
    });

    it("adapterType returns ECR", () => {
      expect(service.adapterType).toBe(RegistryType.ECR);
    });

    it("normalizeImage() strips ECR host from full image reference", () => {
      const result = service.normalizeImage(
        "123456789.dkr.ecr.us-east-1.amazonaws.com/my-service:latest",
      );
      expect(result).toBe("my-service");
    });

    it("normalizeImage() handles image with no tag (ECR host)", () => {
      const result = service.normalizeImage(
        "123456789.dkr.ecr.us-east-1.amazonaws.com/my-service",
      );
      expect(result).toBe("my-service");
    });

    it("normalizeImage() returns base name when host is not amazonaws.com", () => {
      const result = service.normalizeImage("myregistry.example.com/repo:tag");
      expect(result).toBe("myregistry.example.com/repo");
    });

    it("normalizeImage() returns bare name when no slash present", () => {
      const result = service.normalizeImage("my-app:v1");
      expect(result).toBe("my-app");
    });

    it("listTags() normalizes ECR image before delegating", async () => {
      await service.listTags(
        "123456789.dkr.ecr.us-east-1.amazonaws.com/my-service:latest",
      );
      expect(adapter.listTags).toHaveBeenCalledWith("my-service");
    });

    it("getScanResults() normalizes ECR image before delegating", async () => {
      await service.getScanResults(
        "123456789.dkr.ecr.us-east-1.amazonaws.com/my-service",
        "stable",
      );
      expect(adapter.getScanResults).toHaveBeenCalledWith(
        "my-service",
        "stable",
      );
    });
  });

  describe("Docker Hub adapter", () => {
    let service: RegistryService;
    let adapter: IRegistryAdapter;

    beforeEach(async () => {
      adapter = makeAdapter(RegistryType.DOCKER_HUB);
      service = await buildServiceWithAdapter(adapter);
    });

    it("adapterType returns DOCKER_HUB", () => {
      expect(service.adapterType).toBe(RegistryType.DOCKER_HUB);
    });

    it("strips docker.io/ prefix and keeps namespace/repo", () => {
      const result = service.normalizeImage("docker.io/library/nginx:latest");
      expect(result).toBe("library/nginx");
    });

    it("strips index.docker.io/ prefix", () => {
      const result = service.normalizeImage("index.docker.io/myns/myapp:v2");
      expect(result).toBe("myns/myapp");
    });

    it("strips registry-1.docker.io/ prefix", () => {
      const result = service.normalizeImage(
        "registry-1.docker.io/myns/myapp:v2",
      );
      expect(result).toBe("myns/myapp");
    });

    it("adds library/ prefix for bare image names", () => {
      const result = service.normalizeImage("nginx:latest");
      expect(result).toBe("library/nginx");
    });

    it("preserves namespace/repo when no hub prefix is present", () => {
      const result = service.normalizeImage("mynamespace/myimage:1.0");
      expect(result).toBe("mynamespace/myimage");
    });

    it("handles digest reference (@sha256:...)", () => {
      const result = service.normalizeImage("nginx@sha256:abcdef");
      expect(result).toBe("library/nginx");
    });
  });

  describe("Harbor adapter", () => {
    let service: RegistryService;
    let adapter: IRegistryAdapter;

    beforeEach(async () => {
      adapter = makeAdapter(RegistryType.HARBOR);
      service = await buildServiceWithAdapter(adapter);
    });

    it("adapterType returns HARBOR", () => {
      expect(service.adapterType).toBe(RegistryType.HARBOR);
    });

    it("strips https:// protocol and host, returns project/repo", () => {
      const result = service.normalizeImage(
        "https://harbor.example.com/library/nginx:latest",
      );
      expect(result).toBe("library/nginx");
    });

    it("strips bare host prefix (with dot) and returns project/repo", () => {
      const result = service.normalizeImage(
        "harbor.example.com/myproject/myrepo:stable",
      );
      expect(result).toBe("myproject/myrepo");
    });

    it("strips host with port and returns project/repo", () => {
      const result = service.normalizeImage("harbor.local:5000/proj/app:v3");
      expect(result).toBe("proj/app");
    });

    it("passes through path with no clear host (single segment)", () => {
      const result = service.normalizeImage("proj/app:v1");
      expect(result).toBe("proj/app");
    });

    it("listTags() normalizes harbor image before delegating", async () => {
      await service.listTags("harbor.example.com/myproject/myrepo:latest");
      expect(adapter.listTags).toHaveBeenCalledWith("myproject/myrepo");
    });
  });

  describe("GCR / default adapter", () => {
    let service: RegistryService;
    let adapter: IRegistryAdapter;

    beforeEach(async () => {
      adapter = makeAdapter(RegistryType.GCR);
      service = await buildServiceWithAdapter(adapter);
    });

    it("adapterType returns GCR", () => {
      expect(service.adapterType).toBe(RegistryType.GCR);
    });

    it("normalizeImage() strips only tag/digest for GCR images", () => {
      const result = service.normalizeImage(
        "gcr.io/my-project/my-image:v1.2.3",
      );
      expect(result).toBe("gcr.io/my-project/my-image");
    });

    it("normalizeImage() strips digest for GCR images", () => {
      const result = service.normalizeImage(
        "gcr.io/my-project/my-image@sha256:deadbeef",
      );
      expect(result).toBe("gcr.io/my-project/my-image");
    });
  });

  describe("null adapter", () => {
    it("adapterType returns null when no adapter", async () => {
      const service = await buildServiceWithAdapter(null);
      expect(service.adapterType).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// listHarborReplications branch coverage
// ---------------------------------------------------------------------------

describe("RegistryService — listHarborReplications", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns [] when adapter is null", async () => {
    const service = await buildServiceWithAdapter(null);
    expect(await service.listHarborReplications()).toEqual([]);
  });

  it("returns [] when adapter is non-Harbor (ECR)", async () => {
    const service = await buildServiceWithAdapter(
      makeAdapter(RegistryType.ECR),
    );
    expect(await service.listHarborReplications()).toEqual([]);
  });

  it("returns [] when Harbor adapter has no listReplicationPolicies method", async () => {
    const harborAdapter = makeAdapter(RegistryType.HARBOR);
    // Remove the method to test the typeof guard
    (harborAdapter as Record<string, unknown>).listReplicationPolicies =
      undefined;
    const service = await buildServiceWithAdapter(harborAdapter);
    expect(await service.listHarborReplications()).toEqual([]);
  });

  it("calls listReplicationPolicies() and returns results for Harbor adapter", async () => {
    const mockPolicies: HarborReplicationPolicy[] = [
      {
        id: 1,
        name: "push-to-ecr",
        srcRegistry: "local",
        destRegistry: "ecr-prod",
        filters: [],
        triggerType: "scheduled",
        enabled: true,
        lastExecutionStatus: "succeed",
      },
    ];
    const harborAdapter: IRegistryAdapter & {
      listReplicationPolicies: jest.Mock;
    } = {
      ...makeAdapter(RegistryType.HARBOR),
      listReplicationPolicies: jest.fn().mockResolvedValue(mockPolicies),
    };
    const service = await buildServiceWithAdapter(harborAdapter);

    const result = await service.listHarborReplications();

    expect(harborAdapter.listReplicationPolicies).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockPolicies);
  });
});
