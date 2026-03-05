import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CatalogService } from "./catalog.service";
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
    lifecycle: ComponentLifecycle.PRODUCTION,
    tags: ["test"],
    links: [],
    metadata: {},
    dependencies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto: any) => dto as Component),
    save: jest.fn().mockImplementation((component: Component) =>
      Promise.resolve({
        id: component.id || "550e8400-e29b-41d4-a716-446655440001",
        ...component,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Component),
    ),
    find: jest.fn().mockResolvedValue([mockComponent]),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: getRepositoryToken(Component),
          useValue: mockRepository,
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
      await service.findAll();
      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: ["dependencies"],
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
