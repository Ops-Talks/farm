import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CatalogService } from "./catalog.service";
import { EventsGateway } from "../../common/events/events.gateway";
import * as fs from "fs/promises";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "./entities/component.entity";

jest.mock("fs/promises");

describe("CatalogService", () => {
  let service: CatalogService;

  const mockComponent: Component = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "my-service",
    kind: ComponentKind.SERVICE,
    description: "A test service",
    owner: "team-a",
    teamId: null as unknown as string,
    team: null,
    lifecycle: ComponentLifecycle.PRODUCTION,
    tags: ["test"],
    links: [],
    metadata: {},
    helmChart: null,
    dependencies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: null as unknown as string,
  };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto: any) => dto as Component),
    save: jest.fn().mockImplementation((component: Component) =>
      Promise.resolve({
        ...component,
        id: component.id || "550e8400-e29b-41d4-a716-446655440001",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Component),
    ),
    find: jest.fn().mockResolvedValue([mockComponent]),
    findAndCount: jest.fn().mockResolvedValue([[mockComponent], 1]),
    findBy: jest.fn().mockResolvedValue([mockComponent]),
    findOne: jest.fn().mockResolvedValue(mockComponent),
    findOneBy: jest.fn().mockResolvedValue(mockComponent),
    merge: jest.fn().mockImplementation(
      (entity: Component, dto: any) =>
        ({
          ...entity,
          ...dto,
        }) as Component,
    ),
    remove: jest.fn().mockResolvedValue(mockComponent),
  };

  const mockEventsGateway = {
    emitComponentCreated: jest.fn(),
    emitComponentUpdated: jest.fn(),
    emitComponentDeleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: getRepositoryToken(Component),
          useValue: mockRepository,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("discoverFromLocation", () => {
    it("should discover and register a component", async () => {
      jest
        .spyOn(service as any, "gitClone")
        .mockImplementation(() => Promise.resolve());
      jest
        .spyOn(service as any, "findYamlFiles")
        .mockImplementation(() =>
          Promise.resolve(["/tmp/fake/catalog-info.yaml"]),
        );

      (fs.readFile as jest.Mock).mockResolvedValue(`
        apiVersion: farm.io/v1alpha1
        kind: Component
        metadata:
          name: discovered-service
        spec:
          type: service
          owner: team-discovered
      `);

      const result = await service.discoverFromLocation(
        "http://example.com/repo.git",
      );

      expect(result).toBe(1);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe("registerYaml", () => {
    it("should register a component from valid YAML", async () => {
      const yaml = `
apiVersion: farm.io/v1alpha1
kind: Component
metadata:
  name: yaml-service
  description: From YAML
spec:
  type: service
  owner: team-yaml
      `;
      const result = await service.registerYaml(yaml);
      expect(result.name).toBe("yaml-service");
      expect(result.owner).toBe("team-yaml");
    });
  });

  describe("create", () => {
    it("should create a component with dependencies", async () => {
      const dto = {
        name: "service-with-dep",
        kind: ComponentKind.SERVICE,
        owner: "team-a",
        dependencyIds: ["dep-1"],
      };
      await service.create(dto);
      expect(mockRepository.findBy).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("should return all components with relations", async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockComponent], 1]);
      const [data, total] = await service.findAll();
      expect(data).toEqual([mockComponent]);
      expect(total).toBe(1);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        relations: ["dependencies"],
        skip: 0,
        take: 20,
      });
    });
  });

  describe("findOne", () => {
    it("should return a component by ID with relations", async () => {
      await service.findOne(mockComponent.id);
      expect(mockRepository.findOne).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update dependencies", async () => {
      const dto = { dependencyIds: ["new-dep"] };
      await service.update(mockComponent.id, dto);
      expect(mockRepository.findBy).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});
