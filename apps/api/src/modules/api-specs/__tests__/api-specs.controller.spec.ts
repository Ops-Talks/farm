import { Test, TestingModule } from "@nestjs/testing";
import {
  ApiSpecsComponentController,
  ConsumedApisController,
  ApiSpecsController,
} from "../api-specs.controller";
import { ApiSpecsService } from "../api-specs.service";
import { ApiSpec } from "../entities/api-spec.entity";
import { ApiConsumer } from "../entities/api-consumer.entity";
import { ApiSpecStatus } from "../enums/api-spec-status.enum";
import { ApiSpecFormat } from "../enums/api-spec-format.enum";
import { SpecDiffResult } from "../spec-diff.service";

const SAMPLE_SPEC = `openapi: "3.0.0"\ninfo:\n  title: Test\n  version: "1.0"\npaths: {}`;

const mockApiSpec: ApiSpec = {
  id: "spec-1",
  componentId: "comp-1",
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
  id: "consumer-1",
  apiSpecId: "spec-1",
  apiSpec: null as unknown as ApiConsumer["apiSpec"],
  consumerComponentId: "comp-2",
  consumerComponent: null,
  consumerTeamId: null,
  addedAt: new Date(),
};

const mockDiffResult: SpecDiffResult = {
  totalChanges: 1,
  breakingChanges: 0,
  entries: [{ type: "added", breaking: false, path: "GET /new", detail: "" }],
};

const mockApiSpecsService = {
  create: jest.fn(),
  findAllByComponent: jest.fn(),
  findConsumedApis: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  diff: jest.fn(),
  addConsumer: jest.fn(),
  removeConsumer: jest.fn(),
};

describe("ApiSpecsComponentController", () => {
  let controller: ApiSpecsComponentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiSpecsComponentController],
      providers: [{ provide: ApiSpecsService, useValue: mockApiSpecsService }],
    }).compile();

    controller = module.get<ApiSpecsComponentController>(
      ApiSpecsComponentController,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create()", () => {
    it("should delegate to service.create with componentId and dto", async () => {
      mockApiSpecsService.create.mockResolvedValue(mockApiSpec);
      const dto = {
        name: "My API",
        format: ApiSpecFormat.OPENAPI,
        version: "1.0.0",
        spec: SAMPLE_SPEC,
      };

      const result = await controller.create("comp-1", dto);

      expect(mockApiSpecsService.create).toHaveBeenCalledWith("comp-1", dto);
      expect(result).toEqual(mockApiSpec);
    });
  });

  describe("findAll()", () => {
    it("should delegate to service.findAllByComponent", async () => {
      mockApiSpecsService.findAllByComponent.mockResolvedValue([mockApiSpec]);

      const result = await controller.findAll("comp-1");

      expect(mockApiSpecsService.findAllByComponent).toHaveBeenCalledWith(
        "comp-1",
      );
      expect(result).toEqual([mockApiSpec]);
    });
  });
});

describe("ConsumedApisController", () => {
  let controller: ConsumedApisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsumedApisController],
      providers: [{ provide: ApiSpecsService, useValue: mockApiSpecsService }],
    }).compile();

    controller = module.get<ConsumedApisController>(ConsumedApisController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findConsumedApis()", () => {
    it("should delegate to service.findConsumedApis", async () => {
      mockApiSpecsService.findConsumedApis.mockResolvedValue([mockApiSpec]);

      const result = await controller.findConsumedApis("comp-2");

      expect(mockApiSpecsService.findConsumedApis).toHaveBeenCalledWith(
        "comp-2",
      );
      expect(result).toEqual([mockApiSpec]);
    });
  });
});

describe("ApiSpecsController", () => {
  let controller: ApiSpecsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiSpecsController],
      providers: [{ provide: ApiSpecsService, useValue: mockApiSpecsService }],
    }).compile();

    controller = module.get<ApiSpecsController>(ApiSpecsController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findOne()", () => {
    it("should delegate to service.findOne", async () => {
      mockApiSpecsService.findOne.mockResolvedValue(mockApiSpec);

      const result = await controller.findOne("spec-1");

      expect(mockApiSpecsService.findOne).toHaveBeenCalledWith("spec-1");
      expect(result).toEqual(mockApiSpec);
    });
  });

  describe("update()", () => {
    it("should delegate to service.update with id and dto", async () => {
      const updated = { ...mockApiSpec, status: ApiSpecStatus.DEPRECATED };
      mockApiSpecsService.update.mockResolvedValue(updated);
      const dto = { status: ApiSpecStatus.DEPRECATED };

      const result = await controller.update("spec-1", dto);

      expect(mockApiSpecsService.update).toHaveBeenCalledWith("spec-1", dto);
      expect(result.status).toBe(ApiSpecStatus.DEPRECATED);
    });
  });

  describe("remove()", () => {
    it("should delegate to service.remove", async () => {
      mockApiSpecsService.remove.mockResolvedValue(undefined);

      await controller.remove("spec-1");

      expect(mockApiSpecsService.remove).toHaveBeenCalledWith("spec-1");
    });
  });

  describe("diff()", () => {
    it("should delegate to service.diff with id and compareWith", async () => {
      mockApiSpecsService.diff.mockResolvedValue(mockDiffResult);

      const result = await controller.diff("spec-1", {
        compareWith: "spec-2",
      });

      expect(mockApiSpecsService.diff).toHaveBeenCalledWith("spec-1", "spec-2");
      expect(result).toEqual(mockDiffResult);
    });
  });

  describe("addConsumer()", () => {
    it("should delegate to service.addConsumer with id and dto", async () => {
      mockApiSpecsService.addConsumer.mockResolvedValue(mockConsumer);
      const dto = { consumerComponentId: "comp-2" };

      const result = await controller.addConsumer("spec-1", dto);

      expect(mockApiSpecsService.addConsumer).toHaveBeenCalledWith(
        "spec-1",
        dto,
      );
      expect(result).toEqual(mockConsumer);
    });
  });

  describe("removeConsumer()", () => {
    it("should delegate to service.removeConsumer with both ids", async () => {
      mockApiSpecsService.removeConsumer.mockResolvedValue(undefined);

      await controller.removeConsumer("spec-1", "consumer-1");

      expect(mockApiSpecsService.removeConsumer).toHaveBeenCalledWith(
        "spec-1",
        "consumer-1",
      );
    });
  });
});
