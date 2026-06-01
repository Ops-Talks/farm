import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { OperatorBindingService } from "./operator-binding.service";
import { OperatorBinding } from "./entities/operator-binding.entity";
import { CreateOperatorBindingDto } from "./dto/create-operator-binding.dto";

describe("OperatorBindingService", () => {
  let service: OperatorBindingService;
  let repo: Record<string, jest.Mock>;

  const mockBinding: OperatorBinding = {
    id: "binding-uuid-1",
    operatorName: "prometheus-operator.v0.65.1",
    operatorNamespace: "monitoring",
    componentId: "comp-uuid-1",
    component: {
      id: "comp-uuid-1",
      name: "prometheus",
    } as OperatorBinding["component"],
    addedAt: new Date("2024-01-01T00:00:00Z"),
    organizationId: "org-uuid-1",
  };

  const createDto: CreateOperatorBindingDto = {
    operatorName: "prometheus-operator.v0.65.1",
    operatorNamespace: "monitoring",
    componentId: "comp-uuid-1",
    organizationId: "org-uuid-1",
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorBindingService,
        {
          provide: getRepositoryToken(OperatorBinding),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<OperatorBindingService>(OperatorBindingService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("should create a new binding successfully", async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockBinding);
      repo.save.mockResolvedValue(mockBinding);

      const result = await service.create(createDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          operatorName: createDto.operatorName,
          operatorNamespace: createDto.operatorNamespace,
          componentId: createDto.componentId,
          organizationId: createDto.organizationId,
        },
      });
      expect(repo.create).toHaveBeenCalledWith(createDto);
      expect(repo.save).toHaveBeenCalledWith(mockBinding);
      expect(result).toEqual(mockBinding);
    });

    it("should create a binding without organizationId when not provided", async () => {
      const dtoWithoutOrg = {
        operatorName: "prometheus-operator.v0.65.1",
        operatorNamespace: "monitoring",
        componentId: "comp-uuid-1",
      };
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(mockBinding);
      repo.save.mockResolvedValue(mockBinding);

      await service.create(dtoWithoutOrg);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          operatorName: dtoWithoutOrg.operatorName,
          operatorNamespace: dtoWithoutOrg.operatorNamespace,
          componentId: dtoWithoutOrg.componentId,
        },
      });
    });

    it("should throw ConflictException when a duplicate binding exists", async () => {
      repo.findOne.mockResolvedValue(mockBinding);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        `Binding already exists for operator "${createDto.operatorName}" in namespace "${createDto.operatorNamespace}" with component "${createDto.componentId}"`,
      );
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findByOperator
  // ---------------------------------------------------------------------------

  describe("findByOperator", () => {
    it("should return bindings filtered by operator name", async () => {
      repo.find.mockResolvedValue([mockBinding]);

      const result = await service.findByOperator(
        "prometheus-operator.v0.65.1",
      );

      expect(repo.find).toHaveBeenCalledWith({
        where: { operatorName: "prometheus-operator.v0.65.1" },
        relations: { component: true },
      });
      expect(result).toEqual([mockBinding]);
    });

    it("should filter by organizationId when provided", async () => {
      repo.find.mockResolvedValue([mockBinding]);

      const result = await service.findByOperator(
        "prometheus-operator.v0.65.1",
        "org-uuid-1",
      );

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          operatorName: "prometheus-operator.v0.65.1",
          organizationId: "org-uuid-1",
        },
        relations: { component: true },
      });
      expect(result).toEqual([mockBinding]);
    });
  });

  // ---------------------------------------------------------------------------
  // findByComponent
  // ---------------------------------------------------------------------------

  describe("findByComponent", () => {
    it("should return bindings by componentId with component relation loaded", async () => {
      repo.find.mockResolvedValue([mockBinding]);

      const result = await service.findByComponent("comp-uuid-1");

      expect(repo.find).toHaveBeenCalledWith({
        where: { componentId: "comp-uuid-1" },
        relations: { component: true },
      });
      expect(result).toEqual([mockBinding]);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe("remove", () => {
    it("should delete a binding successfully", async () => {
      repo.findOne.mockResolvedValue(mockBinding);
      repo.remove.mockResolvedValue(undefined);

      await expect(
        service.remove(
          "prometheus-operator.v0.65.1",
          "monitoring",
          "comp-uuid-1",
          "org-uuid-1",
        ),
      ).resolves.toBeUndefined();

      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          operatorName: "prometheus-operator.v0.65.1",
          operatorNamespace: "monitoring",
          componentId: "comp-uuid-1",
          organizationId: "org-uuid-1",
        },
      });
      expect(repo.remove).toHaveBeenCalledWith(mockBinding);
    });

    it("should throw NotFoundException when binding does not exist", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove("nonexistent-op", "default", "comp-uuid-999", "org-1"),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.remove("nonexistent-op", "default", "comp-uuid-999", "org-1"),
      ).rejects.toThrow(
        'Binding not found for operator "nonexistent-op" in namespace "default" with component "comp-uuid-999"',
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
