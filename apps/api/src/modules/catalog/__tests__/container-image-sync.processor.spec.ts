import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import {
  ContainerImageSyncProcessor,
  ContainerImageSyncJobData,
} from '../processors/container-image-sync.processor';
import { CatalogService } from '../catalog.service';

describe('ContainerImageSyncProcessor', () => {
  let processor: ContainerImageSyncProcessor;

  const mockCatalogService = {
    syncContainerImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContainerImageSyncProcessor,
        { provide: CatalogService, useValue: mockCatalogService },
      ],
    }).compile();

    processor = module.get<ContainerImageSyncProcessor>(ContainerImageSyncProcessor);
    jest.clearAllMocks();
  });

  function makeJob(data: ContainerImageSyncJobData): Job<ContainerImageSyncJobData> {
    return { id: 'job-1', data } as Job<ContainerImageSyncJobData>;
  }

  it('calls catalogService.syncContainerImage with the componentId from job data', async () => {
    mockCatalogService.syncContainerImage.mockResolvedValue({});

    await processor.process(makeJob({ componentId: 'comp-uuid-001' }));

    expect(mockCatalogService.syncContainerImage).toHaveBeenCalledWith('comp-uuid-001');
    expect(mockCatalogService.syncContainerImage).toHaveBeenCalledTimes(1);
  });

  it('re-throws the error after logging when syncContainerImage fails', async () => {
    const syncError = new Error('Registry unavailable');
    mockCatalogService.syncContainerImage.mockRejectedValue(syncError);

    await expect(
      processor.process(makeJob({ componentId: 'comp-uuid-001' })),
    ).rejects.toThrow('Registry unavailable');
  });
});
