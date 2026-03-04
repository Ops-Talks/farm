import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { DocumentationService } from "./documentation.service";

describe("DocumentationService", () => {
  let service: DocumentationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentationService],
    }).compile();

    service = module.get<DocumentationService>(DocumentationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a documentation entry with required fields", () => {
      const doc = service.create({
        title: "Getting Started",
        content: "This is the content",
        componentId: "component-123",
        author: "alice",
      });

      expect(doc.id).toBeDefined();
      expect(doc.title).toBe("Getting Started");
      expect(doc.content).toBe("This is the content");
      expect(doc.componentId).toBe("component-123");
      expect(doc.author).toBe("alice");
      expect(doc.version).toBe("1.0.0");
    });

    it("should create a documentation entry with a specified version", () => {
      const doc = service.create({
        title: "API Reference",
        content: "API docs",
        componentId: "comp-456",
        author: "bob",
        version: "2.0.0",
      });

      expect(doc.version).toBe("2.0.0");
    });
  });

  describe("findAll", () => {
    it("should return an empty array initially", () => {
      expect(service.findAll()).toEqual([]);
    });

    it("should return all created documentation entries", () => {
      service.create({
        title: "Doc 1",
        content: "Content 1",
        componentId: "comp-1",
        author: "alice",
      });
      service.create({
        title: "Doc 2",
        content: "Content 2",
        componentId: "comp-2",
        author: "bob",
      });

      expect(service.findAll()).toHaveLength(2);
    });
  });

  describe("findByComponent", () => {
    it("should return documentation for the specified component", () => {
      service.create({
        title: "Doc A",
        content: "Content A",
        componentId: "comp-a",
        author: "alice",
      });
      service.create({
        title: "Doc B",
        content: "Content B",
        componentId: "comp-b",
        author: "bob",
      });

      const results = service.findByComponent("comp-a");
      expect(results).toHaveLength(1);
      expect(results[0].componentId).toBe("comp-a");
    });

    it("should return an empty array when no docs match the component", () => {
      expect(service.findByComponent("nonexistent-comp")).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return a documentation entry by ID", () => {
      const created = service.create({
        title: "Test Doc",
        content: "Test Content",
        componentId: "comp-x",
        author: "charlie",
      });

      const found = service.findOne(created.id);
      expect(found.id).toBe(created.id);
    });

    it("should throw NotFoundException for unknown ID", () => {
      expect(() => service.findOne("unknown-id")).toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a documentation entry", () => {
      const created = service.create({
        title: "Old Title",
        content: "Old Content",
        componentId: "comp-y",
        author: "dave",
      });

      const updated = service.update(created.id, { title: "New Title" });
      expect(updated.title).toBe("New Title");
      expect(updated.content).toBe("Old Content");
    });

    it("should throw NotFoundException when updating unknown ID", () => {
      expect(() => service.update("unknown-id", { title: "test" })).toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("should remove a documentation entry", () => {
      const created = service.create({
        title: "To Delete",
        content: "Content",
        componentId: "comp-z",
        author: "eve",
      });

      service.remove(created.id);
      expect(service.findAll()).toHaveLength(0);
    });

    it("should throw NotFoundException when removing unknown ID", () => {
      expect(() => service.remove("unknown-id")).toThrow(NotFoundException);
    });
  });
});
