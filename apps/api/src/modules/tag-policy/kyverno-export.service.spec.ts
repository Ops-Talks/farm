import { Test, TestingModule } from "@nestjs/testing";
import * as yaml from "js-yaml";
import { KyvernoExportService } from "./kyverno-export.service";
import { TagPolicyService } from "./tag-policy.service";
import { TagPolicy } from "./entities/tag-policy.entity";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function buildPolicy(overrides: Partial<TagPolicy> = {}): TagPolicy {
  return {
    id: "policy-uuid-1",
    orgId: "org-uuid-1",
    resourceType: "k8s-deployment",
    requiredKeys: ["env", "team"],
    severity: "warning",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KyvernoExportService", () => {
  let service: KyvernoExportService;
  let mockTagPolicyService: jest.Mocked<Pick<TagPolicyService, "findOne">>;

  beforeEach(async () => {
    mockTagPolicyService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KyvernoExportService,
        { provide: TagPolicyService, useValue: mockTagPolicyService },
      ],
    }).compile();

    service = module.get<KyvernoExportService>(KyvernoExportService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // validationFailureAction mapping
  // -------------------------------------------------------------------------

  describe("validationFailureAction", () => {
    it("should set validationFailureAction to Audit for severity=warning", async () => {
      mockTagPolicyService.findOne.mockResolvedValue(
        buildPolicy({ severity: "warning" }),
      );

      const { yaml: yamlStr } =
        await service.exportTagPolicyAsClusterPolicy("policy-uuid-1");

      const parsed = yaml.load(yamlStr) as Record<string, unknown>;
      const spec = parsed.spec as Record<string, unknown>;
      expect(spec.validationFailureAction).toBe("Audit");
    });

    it("should set validationFailureAction to Enforce for severity=error", async () => {
      mockTagPolicyService.findOne.mockResolvedValue(
        buildPolicy({ severity: "error" }),
      );

      const { yaml: yamlStr } =
        await service.exportTagPolicyAsClusterPolicy("policy-uuid-1");

      const parsed = yaml.load(yamlStr) as Record<string, unknown>;
      const spec = parsed.spec as Record<string, unknown>;
      expect(spec.validationFailureAction).toBe("Enforce");
    });
  });

  // -------------------------------------------------------------------------
  // Kind mapping
  // -------------------------------------------------------------------------

  describe("kind mapping", () => {
    it("should map k8s-deployment to Deployment in the rules kinds array", async () => {
      mockTagPolicyService.findOne.mockResolvedValue(
        buildPolicy({ resourceType: "k8s-deployment" }),
      );

      const { yaml: yamlStr } =
        await service.exportTagPolicyAsClusterPolicy("policy-uuid-1");

      const parsed = yaml.load(yamlStr) as Record<string, unknown>;
      const spec = parsed.spec as { rules: Array<Record<string, unknown>> };
      const rule = spec.rules[0];
      const match = rule.match as {
        any: Array<{ resources: { kinds: string[] } }>;
      };
      expect(match.any[0].resources.kinds).toContain("Deployment");
    });

    it("should use '*' kind for wildcard resourceType", async () => {
      mockTagPolicyService.findOne.mockResolvedValue(
        buildPolicy({ resourceType: "*" }),
      );

      const { yaml: yamlStr } =
        await service.exportTagPolicyAsClusterPolicy("policy-uuid-1");

      const parsed = yaml.load(yamlStr) as Record<string, unknown>;
      const spec = parsed.spec as { rules: Array<Record<string, unknown>> };
      const rule = spec.rules[0];
      const match = rule.match as {
        any: Array<{ resources: { kinds: string[] } }>;
      };
      expect(match.any[0].resources.kinds).toContain("*");
    });

    it("should fall back to capitalizing the first letter for unknown resource types", async () => {
      mockTagPolicyService.findOne.mockResolvedValue(
        buildPolicy({ resourceType: "custom-resource" }),
      );

      const { yaml: yamlStr } =
        await service.exportTagPolicyAsClusterPolicy("policy-uuid-1");

      const parsed = yaml.load(yamlStr) as Record<string, unknown>;
      const spec = parsed.spec as { rules: Array<Record<string, unknown>> };
      const rule = spec.rules[0];
      const match = rule.match as {
        any: Array<{ resources: { kinds: string[] } }>;
      };
      expect(match.any[0].resources.kinds[0]).toBe("Custom-resource");
    });
  });

  // -------------------------------------------------------------------------
  // Required keys in labels pattern
  // -------------------------------------------------------------------------

  describe("labels pattern", () => {
    it("should include each requiredKey in the labels pattern with value '?*'", async () => {
      mockTagPolicyService.findOne.mockResolvedValue(
        buildPolicy({ requiredKeys: ["env", "team", "cost-center"] }),
      );

      const { yaml: yamlStr } =
        await service.exportTagPolicyAsClusterPolicy("policy-uuid-1");

      const parsed = yaml.load(yamlStr) as Record<string, unknown>;
      const spec = parsed.spec as { rules: Array<Record<string, unknown>> };
      const rule = spec.rules[0];
      const validate = rule.validate as {
        pattern: { metadata: { labels: Record<string, string> } };
      };
      const labelsPattern = validate.pattern.metadata.labels;

      expect(labelsPattern["env"]).toBe("?*");
      expect(labelsPattern["team"]).toBe("?*");
      expect(labelsPattern["cost-center"]).toBe("?*");
    });
  });

  // -------------------------------------------------------------------------
  // Metadata and filename
  // -------------------------------------------------------------------------

  describe("metadata and filename", () => {
    it("should embed the tagPolicyId in farm.io/policy-id annotation", async () => {
      mockTagPolicyService.findOne.mockResolvedValue(
        buildPolicy({ id: "policy-uuid-1" }),
      );

      const { yaml: yamlStr } =
        await service.exportTagPolicyAsClusterPolicy("policy-uuid-1");

      const parsed = yaml.load(yamlStr) as Record<string, unknown>;
      const metadata = parsed.metadata as {
        annotations: Record<string, string>;
      };
      expect(metadata.annotations["farm.io/policy-id"]).toBe("policy-uuid-1");
    });

    it("should produce a sanitized lowercase filename with no spaces", async () => {
      mockTagPolicyService.findOne.mockResolvedValue(
        buildPolicy({ resourceType: "k8s-deployment" }),
      );

      const { filename } =
        await service.exportTagPolicyAsClusterPolicy("policy-uuid-1");

      expect(filename).toBe("farm-require-tags-k8s-deployment.yaml");
      expect(filename).toBe(filename.toLowerCase());
      expect(filename).not.toContain(" ");
    });

    it("should produce a valid YAML document starting with apiVersion", async () => {
      mockTagPolicyService.findOne.mockResolvedValue(buildPolicy());

      const { yaml: yamlStr } =
        await service.exportTagPolicyAsClusterPolicy("policy-uuid-1");

      expect(yamlStr).toContain("apiVersion: kyverno.io/v1");
      expect(yamlStr).toContain("kind: ClusterPolicy");
      // Verify it parses without throwing
      expect(() => yaml.load(yamlStr)).not.toThrow();
    });
  });
});
