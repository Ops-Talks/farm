import { getMetadataArgsStorage } from "typeorm";
import { ServiceTemplate } from "./service-template.entity";

describe("ServiceTemplate entity", () => {
  it("should create an instance", () => {
    const entity = new ServiceTemplate();
    expect(entity).toBeDefined();
  });

  it("should define the service_templates table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === ServiceTemplate);
    expect(table).toBeDefined();
    expect(table?.name).toBe("service_templates");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === ServiceTemplate)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "description",
        "language",
        "framework",
        "tags",
        "repositoryUrl",
        "variables",
        "isBuiltIn",
        "organizationId",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("should have index on organizationId", () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices.filter((i) => i.target === ServiceTemplate);
    const propNames = indices.map((i) => i.columns).flat();
    expect(propNames).toContain("organizationId");
  });

  it("should allow setting all properties", () => {
    const entity = new ServiceTemplate();
    entity.id = "uuid-1";
    entity.name = "test-template";
    entity.description = "A test template";
    entity.language = "typescript";
    entity.framework = "nestjs";
    entity.tags = ["api", "backend"];
    entity.repositoryUrl = "https://github.com/org/template";
    entity.variables = [
      {
        key: "SERVICE_NAME",
        label: "Service Name",
        description: "Name of the service",
        required: true,
        default: "my-service",
        pattern: "^[a-z]+$",
      },
    ];
    entity.isBuiltIn = false;
    entity.organizationId = "org-uuid-1";
    entity.createdAt = new Date();
    entity.updatedAt = new Date();

    expect(entity.id).toBe("uuid-1");
    expect(entity.name).toBe("test-template");
    expect(entity.variables).toHaveLength(1);
    expect(entity.variables[0].key).toBe("SERVICE_NAME");
    expect(entity.variables[0].default).toBe("my-service");
    expect(entity.variables[0].pattern).toBe("^[a-z]+$");
  });
});
