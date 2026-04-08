import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { ContainerImageSyncScheduler } from "../processors/container-image-sync.scheduler";
import { CONTAINER_IMAGE_SYNC_QUEUE } from "../processors/container-image-sync.processor";
import { CatalogService } from "../catalog.service";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "../entities/component.entity";

describe("ContainerImageSyncScheduler", () => {
  let scheduler: ContainerImageSyncScheduler;

  const mockCatalogService = {
    findAllWithContainerImage: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: "job-id" }),
  };

  const baseComponent = (id: string): Component =>
    ({
      id,
      name: `service-${id}`,
      kind: ComponentKind.SERVICE,
      description: null,
      owner: "team-a",
      teamId: null,
      team: null,
      lifecycle: ComponentLifecycle.PRODUCTION,
      tags: [],
      links: [],
      metadata: {},
      helmChart: null,
      argocdApp: null,
      containerImage: { registry: "ecr", image: "myapp" },
      dependencies: [],
      organizationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as unknown as Component;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContainerImageSyncScheduler,
        { provide: CatalogService, useValue: mockCatalogService },
        {
          provide: getQueueToken(CONTAINER_IMAGE_SYNC_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    scheduler = module.get<ContainerImageSyncScheduler>(
      ContainerImageSyncScheduler,
    );
    jest.clearAllMocks();
  });

  it("enqueues one sync job per component that has a containerImage", async () => {
    const components = [baseComponent("id-1"), baseComponent("id-2")];
    mockCatalogService.findAllWithContainerImage.mockResolvedValue(components);

    await scheduler.scheduleContainerImageSync();

    expect(mockQueue.add).toHaveBeenCalledTimes(2);
    expect(mockQueue.add).toHaveBeenCalledWith(
      "sync",
      { componentId: "id-1" },
      { removeOnComplete: 100, removeOnFail: 50 },
    );
    expect(mockQueue.add).toHaveBeenCalledWith(
      "sync",
      { componentId: "id-2" },
      { removeOnComplete: 100, removeOnFail: 50 },
    );
  });

  it("does nothing when no components have a containerImage", async () => {
    mockCatalogService.findAllWithContainerImage.mockResolvedValue([]);

    await scheduler.scheduleContainerImageSync();

    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});
