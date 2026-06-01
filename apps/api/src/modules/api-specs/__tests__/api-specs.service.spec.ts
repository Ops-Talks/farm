import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ApiSpecsService } from "../api-specs.service";
import { ApiSpec } from "../entities/api-spec.entity";
import { ApiConsumer } from "../entities/api-consumer.entity";
import { ApiSpecStatus } from "../enums/api-spec-status.enum";
import { ApiSpecFormat } from "../enums/api-spec-format.enum";
import { EventsGateway } from "../../../common/events/events.gateway";
import { SpecDiffService, SpecDiffResult } from "../spec-diff.service";

const SAMPLE_SPEC = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0.0"
paths: {}
`;

describe("ApiSpecsService", () => {
  let service: ApiSpecsService;

  const mockApiSpec: ApiSpec = {
    id: "spec-uuid-1",
    componentId: "comp-uuid-1",
    component: null as unknown as ApiSpec["component"],
    name: "My API",
    format: ApiSpecFormat.OPENAPI,
    version: "1.0.0",
    spec: SAMPLE_SPEC,
    status: ApiSpecStatus.ACTIVE,
    deprecatedAt: null,
    sunsetAt: null,
    organizationId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConsumer: ApiConsumer = {
    id: "consumer-uuid-1",
    apiSpecId: "spec-uuid-1",
    apiSpec: null as unknown as ApiConsumer["apiSpec"],
    consumerComponentId: "comp-uuid-2",
    consumerComponent: null,
    consumerTeamId: null,
    addedAt: new Date(),
  };

  const mockApiSpecRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  const mockApiConsumerRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockEventsGateway = {
    server: { emit: jest.fn() },
  };

  const mockDiffResult: SpecDiffResult = {
    totalChanges: 0,
    breakingChanges: 0,
    entries: [],
  };

  const mockSpecDiffService = {
    diff: jest.fn().mockReturnValue(mockDiffResult),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiSpecsService,
        {
          provide: getRepositoryToken(ApiSpec),
          useValue: mockApiSpecRepo,
        },
        {
          provide: getRepositoryToken(ApiConsumer),
          useValue: mockApiConsumerRepo,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
        {
          provide: SpecDiffService,
          useValue: mockSpecDiffService,
        },
      ],
    }).compile();

    service = module.get<ApiSpecsService>(ApiSpecsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // create
  // --------------------------------------------------------------------------

  describe("create()", () => {
    it("should create and save an API spec", async () => {
      mockApiSpecRepo.create.mockReturnValue(mockApiSpec);
      mockApiSpecRepo.save.mockResolvedValue(mockApiSpec);

      const dto = {
        name: "My API",
        format: ApiSpecFormat.OPENAPI,
        version: "1.0.0",
        spec: SAMPLE_SPEC,
      };

      const result = await service.create("comp-uuid-1", dto);

      expect(mockApiSpecRepo.create).toHaveBeenCalledWith({
        ...dto,
        componentId: "comp-uuid-1",
      });
      expect(mockApiSpecRepo.save).toHaveBeenCalledWith(mockApiSpec);
      expect(result).toEqual(mockApiSpec);
    });
  });

  // --------------------------------------------------------------------------
  // findAllByComponent
  // --------------------------------------------------------------------------

  describe("findAllByComponent()", () => {
    it("should return specs ordered by createdAt DESC", async () => {
      mockApiSpecRepo.find.mockResolvedValue([mockApiSpec]);

      const result = await service.findAllByComponent("comp-uuid-1");

      expect(mockApiSpecRepo.find).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1" },
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual([mockApiSpec]);
    });
  });

  // --------------------------------------------------------------------------
  // findOne
  // --------------------------------------------------------------------------

  describe("findOne()", () => {
    it("should return a spec when found", async () => {
      mockApiSpecRepo.findOne.mockResolvedValue(mockApiSpec);

      const result = await service.findOne("spec-uuid-1");
      expect(result).toEqual(mockApiSpec);
    });

    it("should throw NotFoundException when spec is not found", async () => {
      mockApiSpecRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("missing-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --------------------------------------------------------------------------
  // update
  // --------------------------------------------------------------------------

  describe("update()", () => {
    it("should patch status and save", async () => {
      const existing = { ...mockApiSpec };
      mockApiSpecRepo.findOne.mockResolvedValue(existing);
      mockApiSpecRepo.save.mockResolvedValue({
        ...existing,
        status: ApiSpecStatus.SUNSET,
      });

      const result = await service.update("spec-uuid-1", {
        status: ApiSpecStatus.SUNSET,
      });

      expect(result.status).toBe(ApiSpecStatus.SUNSET);
      expect(mockEventsGateway.server.emit).not.toHaveBeenCalled();
    });

    it("should auto-set deprecatedAt when transitioning to DEPRECATED", async () => {
      const existing = { ...mockApiSpec, deprecatedAt: null };
      mockApiSpecRepo.findOne.mockResolvedValue(existing);
      mockApiSpecRepo.save.mockImplementation((s: ApiSpec) =>
        Promise.resolve(s),
      );

      const result = await service.update("spec-uuid-1", {
        status: ApiSpecStatus.DEPRECATED,
      });

      expect(result.status).toBe(ApiSpecStatus.DEPRECATED);
      expect(result.deprecatedAt).toBeInstanceOf(Date);
    });

    it("should emit API_SPEC_DEPRECATED event when status is DEPRECATED", async () => {
      const existing = { ...mockApiSpec, deprecatedAt: null };
      mockApiSpecRepo.findOne.mockResolvedValue(existing);
      mockApiSpecRepo.save.mockImplementation((s: ApiSpec) =>
        Promise.resolve(s),
      );

      await service.update("spec-uuid-1", {
        status: ApiSpecStatus.DEPRECATED,
      });

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        "api-spec:deprecated",
        expect.objectContaining({ id: "spec-uuid-1" }),
      );
    });

    it("should update sunsetAt when provided", async () => {
      const existing = { ...mockApiSpec };
      mockApiSpecRepo.findOne.mockResolvedValue(existing);
      mockApiSpecRepo.save.mockImplementation((s: ApiSpec) =>
        Promise.resolve(s),
      );

      const sunsetAt = "2025-12-31T00:00:00.000Z";
      const result = await service.update("spec-uuid-1", { sunsetAt });

      expect(result.sunsetAt).toEqual(new Date(sunsetAt));
    });
  });

  // --------------------------------------------------------------------------
  // remove
  // --------------------------------------------------------------------------

  describe("remove()", () => {
    it("should delete the spec", async () => {
      mockApiSpecRepo.findOne.mockResolvedValue(mockApiSpec);
      mockApiSpecRepo.remove.mockResolvedValue(undefined);

      await service.remove("spec-uuid-1");

      expect(mockApiSpecRepo.remove).toHaveBeenCalledWith(mockApiSpec);
    });

    it("should throw NotFoundException when spec is not found", async () => {
      mockApiSpecRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("missing-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --------------------------------------------------------------------------
  // diff
  // --------------------------------------------------------------------------

  describe("diff()", () => {
    it("should call SpecDiffService with raw spec strings", async () => {
      const spec2: ApiSpec = { ...mockApiSpec, id: "spec-uuid-2" };
      mockApiSpecRepo.findOne
        .mockResolvedValueOnce(mockApiSpec)
        .mockResolvedValueOnce(spec2);

      const result = await service.diff("spec-uuid-1", "spec-uuid-2");

      expect(mockSpecDiffService.diff).toHaveBeenCalledWith(
        mockApiSpec.spec,
        spec2.spec,
      );
      expect(result).toEqual(mockDiffResult);
    });

    it("should throw NotFoundException when the baseline spec is missing", async () => {
      mockApiSpecRepo.findOne.mockResolvedValue(null);

      await expect(service.diff("bad-id", "spec-uuid-2")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --------------------------------------------------------------------------
  // addConsumer
  // --------------------------------------------------------------------------

  describe("addConsumer()", () => {
    it("should create and save a consumer record", async () => {
      mockApiConsumerRepo.create.mockReturnValue(mockConsumer);
      mockApiConsumerRepo.save.mockResolvedValue(mockConsumer);

      const result = await service.addConsumer("spec-uuid-1", {
        consumerComponentId: "comp-uuid-2",
      });

      expect(mockApiConsumerRepo.create).toHaveBeenCalledWith({
        apiSpecId: "spec-uuid-1",
        consumerComponentId: "comp-uuid-2",
        consumerTeamId: null,
      });
      expect(result).toEqual(mockConsumer);
    });

    it("should throw ConflictException when neither id is provided", async () => {
      await expect(service.addConsumer("spec-uuid-1", {})).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw ConflictException on unique constraint violation", async () => {
      mockApiConsumerRepo.create.mockReturnValue(mockConsumer);
      mockApiConsumerRepo.save.mockRejectedValue(
        new Error("UNIQUE constraint failed"),
      );

      await expect(
        service.addConsumer("spec-uuid-1", {
          consumerComponentId: "comp-uuid-2",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // --------------------------------------------------------------------------
  // removeConsumer
  // --------------------------------------------------------------------------

  describe("removeConsumer()", () => {
    it("should delete the consumer record", async () => {
      mockApiConsumerRepo.findOne.mockResolvedValue(mockConsumer);
      mockApiConsumerRepo.remove.mockResolvedValue(undefined);

      await service.removeConsumer("spec-uuid-1", "consumer-uuid-1");

      expect(mockApiConsumerRepo.remove).toHaveBeenCalledWith(mockConsumer);
    });

    it("should throw NotFoundException when consumer is not found", async () => {
      mockApiConsumerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeConsumer("spec-uuid-1", "missing-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --------------------------------------------------------------------------
  // findConsumedApis
  // --------------------------------------------------------------------------

  describe("findConsumedApis()", () => {
    it("should return distinct API specs consumed by a component", async () => {
      const consumerWithSpec = {
        ...mockConsumer,
        apiSpec: mockApiSpec,
      };
      mockApiConsumerRepo.find.mockResolvedValue([consumerWithSpec]);

      const result = await service.findConsumedApis("comp-uuid-2");

      expect(mockApiConsumerRepo.find).toHaveBeenCalledWith({
        where: { consumerComponentId: "comp-uuid-2" },
        relations: { apiSpec: true },
      });
      expect(result).toEqual([mockApiSpec]);
    });

    it("should deduplicate specs when the same spec appears multiple times", async () => {
      const consumer1 = { ...mockConsumer, id: "c1", apiSpec: mockApiSpec };
      const consumer2 = { ...mockConsumer, id: "c2", apiSpec: mockApiSpec };
      mockApiConsumerRepo.find.mockResolvedValue([consumer1, consumer2]);

      const result = await service.findConsumedApis("comp-uuid-2");

      expect(result).toHaveLength(1);
    });

    it("should return empty array when no consumer records exist", async () => {
      mockApiConsumerRepo.find.mockResolvedValue([]);

      const result = await service.findConsumedApis("comp-uuid-2");

      expect(result).toEqual([]);
    });
  });
});
