import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { ComponentKind, ComponentLifecycle } from "./entities/component.entity";

describe("CatalogService", () => {
  let service: CatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogService],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a component with required fields", () => {
      const component = service.create({
        name: "my-service",
        kind: ComponentKind.SERVICE,
        owner: "team-a",
      });

      expect(component.id).toBeDefined();
      expect(component.name).toBe("my-service");
      expect(component.kind).toBe(ComponentKind.SERVICE);
      expect(component.owner).toBe("team-a");
      expect(component.lifecycle).toBe(ComponentLifecycle.EXPERIMENTAL);
      expect(component.tags).toEqual([]);
    });

    it("should create a component with all fields", () => {
      const component = service.create({
        name: "my-library",
        kind: ComponentKind.LIBRARY,
        description: "A shared library",
        owner: "team-b",
        lifecycle: ComponentLifecycle.PRODUCTION,
        tags: ["typescript", "shared"],
        metadata: { techStack: "node" },
      });

      expect(component.name).toBe("my-library");
      expect(component.lifecycle).toBe(ComponentLifecycle.PRODUCTION);
      expect(component.tags).toEqual(["typescript", "shared"]);
    });
  });

  describe("findAll", () => {
    it("should return an empty array initially", () => {
      expect(service.findAll()).toEqual([]);
    });

    it("should return all created components", () => {
      service.create({
        name: "svc-1",
        kind: ComponentKind.SERVICE,
        owner: "team-a",
      });
      service.create({
        name: "svc-2",
        kind: ComponentKind.API,
        owner: "team-b",
      });

      expect(service.findAll()).toHaveLength(2);
    });
  });

  describe("findOne", () => {
    it("should return a component by ID", () => {
      const created = service.create({
        name: "my-api",
        kind: ComponentKind.API,
        owner: "team-c",
      });

      const found = service.findOne(created.id);
      expect(found.id).toBe(created.id);
    });

    it("should throw NotFoundException for unknown ID", () => {
      expect(() => service.findOne("unknown-id")).toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a component", () => {
      const created = service.create({
        name: "old-name",
        kind: ComponentKind.WEBSITE,
        owner: "team-d",
      });

      const updated = service.update(created.id, { name: "new-name" });
      expect(updated.name).toBe("new-name");
      expect(updated.owner).toBe("team-d");
    });

    it("should throw NotFoundException when updating unknown ID", () => {
      expect(() => service.update("unknown-id", { name: "test" })).toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("should remove a component", () => {
      const created = service.create({
        name: "to-delete",
        kind: ComponentKind.COMPONENT,
        owner: "team-e",
      });

      service.remove(created.id);
      expect(service.findAll()).toHaveLength(0);
    });

    it("should throw NotFoundException when removing unknown ID", () => {
      expect(() => service.remove("unknown-id")).toThrow(NotFoundException);
    });
  });
});
