import { getMetadataArgsStorage } from "typeorm";
import {
  EnvironmentRequest,
  EnvironmentRequestStatus,
  EnvironmentType,
  EnvironmentTier,
} from "./environment-request.entity";

describe("EnvironmentRequest entity", () => {
  it("should create an instance", () => {
    const entity = new EnvironmentRequest();
    expect(entity).toBeDefined();
  });

  it("should define the environment_requests table", () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((t) => t.target === EnvironmentRequest);
    expect(table).toBeDefined();
    expect(table?.name).toBe("environment_requests");
  });

  it("should expose all expected columns", () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns
      .filter((c) => c.target === EnvironmentRequest)
      .map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "description",
        "requestedBy",
        "type",
        "tier",
        "ttlHours",
        "status",
        "statusMessage",
        "reviewedBy",
        "reviewedAt",
        "provisionedAt",
        "expiresAt",
        "componentId",
        "environmentId",
        "organizationId",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("should have index on componentId", () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices.filter(
      (i) => i.target === EnvironmentRequest,
    );
    const propNames = indices.map((i) => i.columns).flat();
    expect(propNames).toContain("componentId");
  });

  it("should have index on organizationId", () => {
    const storage = getMetadataArgsStorage();
    const indices = storage.indices.filter(
      (i) => i.target === EnvironmentRequest,
    );
    const propNames = indices.map((i) => i.columns).flat();
    expect(propNames).toContain("organizationId");
  });

  it("should export EnvironmentRequestStatus enum with expected values", () => {
    expect(EnvironmentRequestStatus.PENDING).toBe("pending");
    expect(EnvironmentRequestStatus.APPROVED).toBe("approved");
    expect(EnvironmentRequestStatus.REJECTED).toBe("rejected");
    expect(EnvironmentRequestStatus.PROVISIONING).toBe("provisioning");
    expect(EnvironmentRequestStatus.ACTIVE).toBe("active");
    expect(EnvironmentRequestStatus.EXPIRED).toBe("expired");
  });

  it("should have exactly six EnvironmentRequestStatus values", () => {
    const values = Object.values(EnvironmentRequestStatus);
    expect(values).toHaveLength(6);
    expect(values).toEqual(
      expect.arrayContaining([
        "pending",
        "approved",
        "rejected",
        "provisioning",
        "active",
        "expired",
      ]),
    );
  });

  it("should export EnvironmentType enum with expected values", () => {
    expect(EnvironmentType.EPHEMERAL).toBe("ephemeral");
    expect(EnvironmentType.PERSISTENT).toBe("persistent");
  });

  it("should have exactly two EnvironmentType values", () => {
    const values = Object.values(EnvironmentType);
    expect(values).toHaveLength(2);
    expect(values).toEqual(expect.arrayContaining(["ephemeral", "persistent"]));
  });

  it("should export EnvironmentTier enum with expected values", () => {
    expect(EnvironmentTier.SMALL).toBe("small");
    expect(EnvironmentTier.MEDIUM).toBe("medium");
    expect(EnvironmentTier.LARGE).toBe("large");
  });

  it("should have exactly three EnvironmentTier values", () => {
    const values = Object.values(EnvironmentTier);
    expect(values).toHaveLength(3);
    expect(values).toEqual(
      expect.arrayContaining(["small", "medium", "large"]),
    );
  });

  it("should allow setting all properties", () => {
    const entity = new EnvironmentRequest();
    const now = new Date();

    entity.id = "uuid-1";
    entity.name = "staging-env";
    entity.description = "A staging environment";
    entity.requestedBy = "user-uuid-1";
    entity.type = EnvironmentType.EPHEMERAL;
    entity.tier = EnvironmentTier.MEDIUM;
    entity.ttlHours = 48;
    entity.status = EnvironmentRequestStatus.ACTIVE;
    entity.statusMessage = "Provisioned successfully";
    entity.reviewedBy = "reviewer-uuid-1";
    entity.reviewedAt = now;
    entity.provisionedAt = now;
    entity.expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    entity.componentId = "comp-uuid-1";
    entity.environmentId = "env-uuid-1";
    entity.organizationId = "org-uuid-1";
    entity.createdAt = now;
    entity.updatedAt = now;

    expect(entity.id).toBe("uuid-1");
    expect(entity.name).toBe("staging-env");
    expect(entity.type).toBe(EnvironmentType.EPHEMERAL);
    expect(entity.tier).toBe(EnvironmentTier.MEDIUM);
    expect(entity.status).toBe(EnvironmentRequestStatus.ACTIVE);
    expect(entity.ttlHours).toBe(48);
    expect(entity.componentId).toBe("comp-uuid-1");
    expect(entity.environmentId).toBe("env-uuid-1");
  });
});
