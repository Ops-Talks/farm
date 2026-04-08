import { Test, TestingModule } from '@nestjs/testing';
import { RegistryController } from '../registry.controller';
import { RegistryService } from '../registry.service';
import { VulnerabilityService } from '../vulnerability.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  RepositoryDto,
  TagDto,
  ManifestDto,
  ScanResultDto,
} from '../interfaces/registry-adapter.interface';

const mockRepositories: RepositoryDto[] = [
  { name: 'my-app', uri: '123.dkr.ecr.us-east-1.amazonaws.com/my-app' },
];

const mockTags: TagDto[] = [
  { tag: 'latest', digest: 'sha256:abc' },
];

const mockManifest: ManifestDto = {
  digest: 'sha256:abc',
  mediaType: 'application/vnd.oci.image.manifest.v1+json',
  tags: ['latest'],
};

const mockScanResult: ScanResultDto = {
  status: 'COMPLETE',
  vulnerabilities: [],
};

describe('RegistryController', () => {
  let controller: RegistryController;

  const mockRegistryService = {
    listRepositories: jest.fn().mockResolvedValue(mockRepositories),
    listTags: jest.fn().mockResolvedValue(mockTags),
    getManifest: jest.fn().mockResolvedValue(mockManifest),
    getScanResults: jest.fn().mockResolvedValue(mockScanResult),
  };

  const mockVulnService = {
    findByComponent: jest.fn().mockResolvedValue([]),
    getSummary: jest.fn().mockResolvedValue({ critical: 0, high: 0, medium: 0, low: 0, informational: 0, total: 0 }),
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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listRepositories()', () => {
    it('should return repositories from service', async () => {
      const result = await controller.listRepositories();

      expect(mockRegistryService.listRepositories).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRepositories);
    });
  });

  describe('listTags()', () => {
    it('should return tags from service', async () => {
      const result = await controller.listTags('my-app');

      expect(mockRegistryService.listTags).toHaveBeenCalledWith('my-app');
      expect(result).toEqual(mockTags);
    });
  });

  describe('getManifest()', () => {
    it('should return manifest from service', async () => {
      const result = await controller.getManifest('my-app', 'latest');

      expect(mockRegistryService.getManifest).toHaveBeenCalledWith('my-app', 'latest');
      expect(result).toEqual(mockManifest);
    });
  });

  describe('getScanResults()', () => {
    it('should return scan results from service', async () => {
      const result = await controller.getScanResults('my-app', 'latest');

      expect(mockRegistryService.getScanResults).toHaveBeenCalledWith('my-app', 'latest');
      expect(result).toEqual(mockScanResult);
    });
  });
});
