import {
  PluginValidatorService,
  KNOWN_PERMISSION_SCOPES,
} from "../services/plugin-validator.service";
import { PluginManifestV2 } from "../interfaces/plugin-manifest-v2.interface";

describe("PluginValidatorService", () => {
  let service: PluginValidatorService;

  const validManifest: PluginManifestV2 = {
    id: "farm-plugin-slack",
    name: "Slack Integration",
    version: "1.0.0",
    description: "Sends notifications to Slack",
    entryPoint: "https://cdn.example.com/slack/1.0.0/index.js",
  };

  beforeEach(() => {
    service = new PluginValidatorService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validate", () => {
    it("should return valid for a manifest with all required fields", () => {
      const result = service.validate(validManifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return valid for a manifest with all optional fields populated", () => {
      const manifest: PluginManifestV2 = {
        ...validManifest,
        author: "Ops-Talks",
        license: "MIT",
        farmMinVersion: "0.1.0",
        permissions: ["catalog:read", "teams:read"],
        dependsOn: [],
        settingsSchema: { type: "object" },
      };
      const result = service.validate(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when id is missing", () => {
      const manifest = { ...validManifest, id: "" };
      const result = service.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('"id"'))).toBe(true);
    });

    it("should fail when name is missing", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name: _n, ...rest } = validManifest;
      const result = service.validate(rest as PluginManifestV2);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('"name"'))).toBe(true);
    });

    it("should fail when version is missing", () => {
      const manifest = { ...validManifest, version: "" };
      const result = service.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('"version"'))).toBe(true);
    });

    it("should fail when description is missing", () => {
      const manifest = { ...validManifest, description: "" };
      const result = service.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('"description"'))).toBe(true);
    });

    it("should fail when entryPoint is missing", () => {
      const manifest = { ...validManifest, entryPoint: "" };
      const result = service.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('"entryPoint"'))).toBe(true);
    });

    it("should fail when version is not valid semver", () => {
      const manifest = { ...validManifest, version: "not-semver" };
      const result = service.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("semantic version"))).toBe(
        true,
      );
    });

    it("should pass with a pre-release semver version", () => {
      const manifest = { ...validManifest, version: "1.0.0-beta.1" };
      const result = service.validate(manifest);
      expect(result.valid).toBe(true);
    });

    it("should fail when farmMinVersion is not valid semver", () => {
      const manifest = { ...validManifest, farmMinVersion: "not-valid" };
      const result = service.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('"farmMinVersion"'))).toBe(
        true,
      );
    });

    it("should fail when farmMinVersion is higher than the current Farm version", () => {
      const manifest = { ...validManifest, farmMinVersion: "99.0.0" };
      const result = service.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Farm >="))).toBe(true);
    });

    it("should pass when farmMinVersion is lower than the current Farm version", () => {
      const manifest = { ...validManifest, farmMinVersion: "0.1.0" };
      const result = service.validate(manifest);
      expect(result.valid).toBe(true);
    });

    it("should fail when a permission scope is not in the known set", () => {
      const manifest = { ...validManifest, permissions: ["unknown:scope"] };
      const result = service.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('"unknown:scope"'))).toBe(
        true,
      );
    });

    it("should pass when all permission scopes are known", () => {
      const manifest = {
        ...validManifest,
        permissions: ["catalog:read", "teams:write"],
      };
      const result = service.validate(manifest);
      expect(result.valid).toBe(true);
    });

    it("should collect multiple errors when multiple fields are invalid", () => {
      const manifest = {
        id: "",
        name: "",
        version: "bad",
        description: "",
        entryPoint: "",
      } as PluginManifestV2;
      const result = service.validate(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("validateDependencies", () => {
    it("should return valid when dependsOn is empty", () => {
      const manifest = { ...validManifest, dependsOn: [] };
      const result = service.validateDependencies(
        manifest,
        new Set(["other-plugin"]),
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return valid when all dependencies are in the registry", () => {
      const manifest = {
        ...validManifest,
        dependsOn: ["farm-plugin-auth", "farm-plugin-catalog"],
      };
      const registeredIds = new Set([
        "farm-plugin-auth",
        "farm-plugin-catalog",
      ]);
      const result = service.validateDependencies(manifest, registeredIds);
      expect(result.valid).toBe(true);
    });

    it("should fail when a declared dependency is not in the registry", () => {
      const manifest = {
        ...validManifest,
        dependsOn: ["farm-plugin-missing"],
      };
      const result = service.validateDependencies(manifest, new Set(["other"]));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("farm-plugin-missing"))).toBe(
        true,
      );
    });

    it("should return valid when dependsOn is not defined", () => {
      const result = service.validateDependencies(validManifest, new Set());
      expect(result.valid).toBe(true);
    });
  });

  describe("KNOWN_PERMISSION_SCOPES", () => {
    it("should include catalog and teams scopes", () => {
      expect(KNOWN_PERMISSION_SCOPES).toContain("catalog:read");
      expect(KNOWN_PERMISSION_SCOPES).toContain("teams:write");
    });
  });
});
