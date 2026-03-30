import { getMetadataArgsStorage } from "typeorm";
import {
  ScaffoldRequest,
  ScaffoldRequestStatus,
} from "./scaffold-request.entity";

describe("ScaffoldRequest entity", () => {
  it("should create an instance", () => {
    const entity = new ScaffoldRequest();
    expect(entity).toBeDefined();
  });

  it("should define the scaffold_requests table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === ScaffoldRequest);
    expect(table).toBeDefined();
    expect(table?.name).toBe("scaffold_requests");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === ScaffoldRequest)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "templateId",
        "templateName",
        "targetRepository",
        "variables",
        "status",
        "statusMessage",
        "requestedBy",
        "dryRun",
        "renderedFiles",
        "organizationId",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("should have index on templateId", () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices.filter((i) => i.target === ScaffoldRequest);
    const propNames = indices.map((i) => i.columns).flat();
    expect(propNames).toContain("templateId");
  });

  it("should have index on organizationId", () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices.filter((i) => i.target === ScaffoldRequest);
    const propNames = indices.map((i) => i.columns).flat();
    expect(propNames).toContain("organizationId");
  });

  it("should export ScaffoldRequestStatus enum with expected values", () => {
    expect(ScaffoldRequestStatus.PENDING).toBe("pending");
    expect(ScaffoldRequestStatus.IN_PROGRESS).toBe("in_progress");
    expect(ScaffoldRequestStatus.COMPLETED).toBe("completed");
    expect(ScaffoldRequestStatus.FAILED).toBe("failed");
  });

  it("should have exactly four status values", () => {
    const values = Object.values(ScaffoldRequestStatus);
    expect(values).toHaveLength(4);
    expect(values).toEqual(
      expect.arrayContaining(["pending", "in_progress", "completed", "failed"]),
    );
  });

  it("should allow setting all properties", () => {
    const entity = new ScaffoldRequest();
    entity.id = "uuid-1";
    entity.templateId = "tpl-uuid-1";
    entity.templateName = "nestjs-api";
    entity.targetRepository = "org/new-service";
    entity.variables = { SERVICE_NAME: "my-service" };
    entity.status = ScaffoldRequestStatus.COMPLETED;
    entity.statusMessage = "Done";
    entity.requestedBy = "user-uuid-1";
    entity.dryRun = false;
    entity.renderedFiles = ["README.md"];
    entity.organizationId = "org-uuid-1";
    entity.createdAt = new Date();
    entity.updatedAt = new Date();

    expect(entity.id).toBe("uuid-1");
    expect(entity.templateId).toBe("tpl-uuid-1");
    expect(entity.renderedFiles).toEqual(["README.md"]);
    expect(entity.status).toBe(ScaffoldRequestStatus.COMPLETED);
  });
});
