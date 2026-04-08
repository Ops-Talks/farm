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
