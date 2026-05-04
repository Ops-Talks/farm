import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";

import { ScorecardEvaluatorService } from "../scorecard-evaluator.service";
import {
  ScorecardLevel,
  ScorecardCriterionResult,
} from "../entities/scorecard-result.entity";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "../../catalog/entities/component.entity";
import { Documentation } from "../../documentation/entities/documentation.entity";
import { ApiSpec } from "../../api-specs/entities/api-spec.entity";
import { ApiHealthCheck } from "../../gateway/entities/api-health-check.entity";
import { Slo } from "../../slo/entities/slo.entity";
import {
  Deployment,
  DeploymentStatus,
} from "../../environments/entities/deployment.entity";
import { ContainerVulnerability } from "../../registry/entities/container-vulnerability.entity";
import { VulnerabilitySeverity } from "../../registry/enums/vulnerability-severity.enum";
import { ResourceViolation } from "../../tag-policy/entities/resource-violation.entity";
import { OpaResult } from "../../opa/entities/opa-result.entity";
import { IacModule } from "../../iac/entities/iac-module.entity";
import { IacStack } from "../../iac/entities/iac-stack.entity";
import { FluxBinding } from "../../kubernetes/entities/flux-binding.entity";
import { ActualCost } from "../../finops/entities/actual-cost.entity";

// ---------------------------------------------------------------------------
// Mock factory — every test gets fresh jest.fn() instances via beforeEach.
// ---------------------------------------------------------------------------

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  merge: jest.fn(),
  findByIds: jest.fn(),
});

// ---------------------------------------------------------------------------
// Reusable component builders
// ---------------------------------------------------------------------------

/** Returns a minimal but fully-typed Component stub. */
function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    id: "comp-uuid-1",
    name: "test-service",
    kind: ComponentKind.SERVICE,
    description: "A test service",
    owner: "my-team",
    teamId: null as unknown as string,
    team: null,
    lifecycle: ComponentLifecycle.PRODUCTION,
    tags: [],
    links: [{ title: "Docs", url: "https://example.com/docs" }],
    metadata: {},
    helmChart: null,
    argocdApp: null,
    containerImage: null,
    dependencies: [],
    costBudgetUsd: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    organizationId: null as unknown as string,
    ...overrides,
  };
}

/** Creates an array of Deployment stubs with the requested success/failure split. */
function makeDeployments(
  successCount: number,
  totalCount: number,
): Partial<Deployment>[] {
  return Array.from({ length: totalCount }, (_, i) => ({
    id: `dep-${i}`,
    status:
      i < successCount ? DeploymentStatus.SUCCEEDED : DeploymentStatus.FAILED,
    createdAt: new Date(),
  }));
}

// ---------------------------------------------------------------------------
// Main test suite
// ---------------------------------------------------------------------------

describe("ScorecardEvaluatorService", () => {
  let service: ScorecardEvaluatorService;

  // Repository mock references — re-created in beforeEach so each test is isolated.
  let componentRepo: ReturnType<typeof mockRepo>;
  let documentationRepo: ReturnType<typeof mockRepo>;
  let apiSpecRepo: ReturnType<typeof mockRepo>;
  let apiHealthCheckRepo: ReturnType<typeof mockRepo>;
  let sloRepo: ReturnType<typeof mockRepo>;
  let deploymentRepo: ReturnType<typeof mockRepo>;
  let containerVulnRepo: ReturnType<typeof mockRepo>;
  let resourceViolationRepo: ReturnType<typeof mockRepo>;
  let opaResultRepo: ReturnType<typeof mockRepo>;
  let iacModuleRepo: ReturnType<typeof mockRepo>;
  let iacStackRepo: ReturnType<typeof mockRepo>;
  let fluxBindingRepo: ReturnType<typeof mockRepo>;
  let actualCostRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    componentRepo = mockRepo();
    documentationRepo = mockRepo();
    apiSpecRepo = mockRepo();
    apiHealthCheckRepo = mockRepo();
    sloRepo = mockRepo();
    deploymentRepo = mockRepo();
    containerVulnRepo = mockRepo();
    resourceViolationRepo = mockRepo();
    opaResultRepo = mockRepo();
    iacModuleRepo = mockRepo();
    iacStackRepo = mockRepo();
    fluxBindingRepo = mockRepo();
    actualCostRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScorecardEvaluatorService,
        { provide: getRepositoryToken(Component), useValue: componentRepo },
        {
          provide: getRepositoryToken(Documentation),
          useValue: documentationRepo,
        },
        { provide: getRepositoryToken(ApiSpec), useValue: apiSpecRepo },
        {
          provide: getRepositoryToken(ApiHealthCheck),
          useValue: apiHealthCheckRepo,
        },
        { provide: getRepositoryToken(Slo), useValue: sloRepo },
        { provide: getRepositoryToken(Deployment), useValue: deploymentRepo },
        {
          provide: getRepositoryToken(ContainerVulnerability),
          useValue: containerVulnRepo,
        },
        {
          provide: getRepositoryToken(ResourceViolation),
          useValue: resourceViolationRepo,
        },
        { provide: getRepositoryToken(OpaResult), useValue: opaResultRepo },
        { provide: getRepositoryToken(IacModule), useValue: iacModuleRepo },
        { provide: getRepositoryToken(IacStack), useValue: iacStackRepo },
        { provide: getRepositoryToken(FluxBinding), useValue: fluxBindingRepo },
        { provide: getRepositoryToken(ActualCost), useValue: actualCostRepo },
      ],
    }).compile();

    service = module.get<ScorecardEvaluatorService>(ScorecardEvaluatorService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // Test 1 — component not found
  // ---------------------------------------------------------------------------

  it("should throw NotFoundException when the component does not exist", async () => {
    componentRepo.findOne.mockResolvedValue(null);

    await expect(service.evaluate("non-existent-id")).rejects.toThrow(
      NotFoundException,
    );
    expect(componentRepo.findOne).toHaveBeenCalledWith({
      where: { id: "non-existent-id" },
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2 — fully passing component achieves GOLD or PLATINUM
  // ---------------------------------------------------------------------------

  it("should return GOLD or PLATINUM level with overallScore >= 75 for a fully passing component", async () => {
    const component = makeComponent();
    componentRepo.findOne.mockResolvedValue(component);

    // ownershipDocs
    documentationRepo.count.mockResolvedValue(1);
    apiSpecRepo.count.mockResolvedValue(1);

    // reliability — health check via createQueryBuilder chain
    apiSpecRepo.find.mockResolvedValue([{ id: "spec-1" }]);
    const hcQb = {
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
    };
    apiHealthCheckRepo.createQueryBuilder.mockReturnValue(hcQb);
    sloRepo.count.mockResolvedValue(1);
    deploymentRepo.find.mockResolvedValue(makeDeployments(10, 10));

    // security — vulnerabilities present but none critical/high; OPA applicable
    containerVulnRepo.count.mockImplementation(
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.severity === VulnerabilitySeverity.CRITICAL)
          return Promise.resolve(0);
        if (where.severity === VulnerabilitySeverity.HIGH)
          return Promise.resolve(0);
        return Promise.resolve(3); // total > 0 makes criteria applicable
      },
    );
    resourceViolationRepo.count.mockResolvedValue(0);
    opaResultRepo.count.mockImplementation(
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.allowed === false) return Promise.resolve(0);
        return Promise.resolve(1); // total > 0 makes criteria applicable
      },
    );

    // infrastructure
    iacModuleRepo.count.mockResolvedValue(1);
    iacStackRepo.count.mockResolvedValue(0);
    fluxBindingRepo.count.mockResolvedValue(1);

    // cost
    actualCostRepo.findOne.mockResolvedValue({ totalCost: 50 }); // within budget

    const result = await service.evaluate(component.id);

    expect(result.overallScore).toBeGreaterThanOrEqual(75);
    expect([ScorecardLevel.GOLD, ScorecardLevel.PLATINUM]).toContain(
      result.level,
    );
    expect(Array.isArray(result.criteria)).toBe(true);
    expect(
      (result.criteria as ScorecardCriterionResult[]).length,
    ).toBeGreaterThanOrEqual(1);
    expect(result.categoryScores).toBeDefined();
    expect(result.componentId).toBe(component.id);
    expect(result.evaluatedAt).toBeInstanceOf(Date);
  });

  // ---------------------------------------------------------------------------
  // Test 3 — component with critical vulnerabilities
  // ---------------------------------------------------------------------------

  it("should fail vulnerability criteria and produce security categoryScore < 50 when critical and high vulnerabilities exist", async () => {
    const component = makeComponent();
    componentRepo.findOne.mockResolvedValue(component);

    // Default safe values for non-security repos
    documentationRepo.count.mockResolvedValue(0);
    apiSpecRepo.count.mockResolvedValue(0);
    apiSpecRepo.find.mockResolvedValue([]);
    sloRepo.count.mockResolvedValue(0);
    deploymentRepo.find.mockResolvedValue([]);
    iacModuleRepo.count.mockResolvedValue(0);
    iacStackRepo.count.mockResolvedValue(0);
    fluxBindingRepo.count.mockResolvedValue(0);
    actualCostRepo.findOne.mockResolvedValue(null);
    resourceViolationRepo.count.mockResolvedValue(0);
    opaResultRepo.count.mockResolvedValue(0);

    // Security — total=3, critical=2, high=1
    containerVulnRepo.count.mockImplementation(
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.severity === VulnerabilitySeverity.CRITICAL)
          return Promise.resolve(2);
        if (where.severity === VulnerabilitySeverity.HIGH)
          return Promise.resolve(1);
        return Promise.resolve(3); // total
      },
    );

    const result = await service.evaluate(component.id);
    const criteria = result.criteria as ScorecardCriterionResult[];

    const noCritical = criteria.find(
      (c) => c.id === "no-critical-vulnerabilities",
    );
    const noHigh = criteria.find((c) => c.id === "no-high-vulnerabilities");

    expect(noCritical).toBeDefined();
    expect(noCritical!.passed).toBe(false);
    expect(noCritical!.notApplicable).toBeFalsy();

    expect(noHigh).toBeDefined();
    expect(noHigh!.passed).toBe(false);
    expect(noHigh!.notApplicable).toBeFalsy();

    expect(result.categoryScores!.security).toBeLessThan(50);
  });

  // ---------------------------------------------------------------------------
  // Test 4 — deployment success rate below threshold
  // ---------------------------------------------------------------------------

  it("should fail deployment-success-rate when fewer than 80% of the last 10 deployments succeeded", async () => {
    const component = makeComponent();
    componentRepo.findOne.mockResolvedValue(component);

    // 5 succeeded, 5 failed → 50% < 80%
    deploymentRepo.find.mockResolvedValue(makeDeployments(5, 10));

    documentationRepo.count.mockResolvedValue(0);
    apiSpecRepo.count.mockResolvedValue(0);
    apiSpecRepo.find.mockResolvedValue([]);
    sloRepo.count.mockResolvedValue(0);
    containerVulnRepo.count.mockResolvedValue(0);
    resourceViolationRepo.count.mockResolvedValue(0);
    opaResultRepo.count.mockResolvedValue(0);
    iacModuleRepo.count.mockResolvedValue(0);
    iacStackRepo.count.mockResolvedValue(0);
    fluxBindingRepo.count.mockResolvedValue(0);
    actualCostRepo.findOne.mockResolvedValue(null);

    const result = await service.evaluate(component.id);
    const criteria = result.criteria as ScorecardCriterionResult[];

    const deploymentCriterion = criteria.find(
      (c) => c.id === "deployment-success-rate",
    );

    expect(deploymentCriterion).toBeDefined();
    expect(deploymentCriterion!.passed).toBe(false);
    expect(deploymentCriterion!.notApplicable).toBeFalsy();
  });

  // ---------------------------------------------------------------------------
  // Test 5 — LIBRARY kind skips api-spec and health-check
  // ---------------------------------------------------------------------------

  it("should mark has-api-spec and has-health-check as notApplicable for LIBRARY components without querying the repos", async () => {
    const component = makeComponent({ kind: ComponentKind.LIBRARY });
    componentRepo.findOne.mockResolvedValue(component);

    documentationRepo.count.mockResolvedValue(0);
    sloRepo.count.mockResolvedValue(0);
    deploymentRepo.find.mockResolvedValue([]);
    containerVulnRepo.count.mockResolvedValue(0);
    resourceViolationRepo.count.mockResolvedValue(0);
    opaResultRepo.count.mockResolvedValue(0);
    iacModuleRepo.count.mockResolvedValue(0);
    iacStackRepo.count.mockResolvedValue(0);
    fluxBindingRepo.count.mockResolvedValue(0);
    actualCostRepo.findOne.mockResolvedValue(null);

    const result = await service.evaluate(component.id);
    const criteria = result.criteria as ScorecardCriterionResult[];

    const apiSpecCriterion = criteria.find((c) => c.id === "has-api-spec");
    const healthCheckCriterion = criteria.find(
      (c) => c.id === "has-health-check",
    );

    expect(apiSpecCriterion).toBeDefined();
    expect(apiSpecCriterion!.notApplicable).toBe(true);

    expect(healthCheckCriterion).toBeDefined();
    expect(healthCheckCriterion!.notApplicable).toBe(true);

    // Repositories that back the skipped criteria must not be queried
    expect(apiSpecRepo.count).not.toHaveBeenCalled();
    expect(apiSpecRepo.find).not.toHaveBeenCalled();
    expect(apiHealthCheckRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Test 6 — query failure is handled gracefully
  // ---------------------------------------------------------------------------

  it("should not throw when a repository query fails and should mark the affected criterion as notApplicable", async () => {
    const component = makeComponent();
    componentRepo.findOne.mockResolvedValue(component);

    // Make the documentation query throw to exercise the error-handling path
    documentationRepo.count.mockRejectedValue(new Error("DB connection lost"));

    apiSpecRepo.count.mockResolvedValue(0);
    apiSpecRepo.find.mockResolvedValue([]);
    sloRepo.count.mockResolvedValue(0);
    deploymentRepo.find.mockResolvedValue([]);
    containerVulnRepo.count.mockResolvedValue(0);
    resourceViolationRepo.count.mockResolvedValue(0);
    opaResultRepo.count.mockResolvedValue(0);
    iacModuleRepo.count.mockResolvedValue(0);
    iacStackRepo.count.mockResolvedValue(0);
    fluxBindingRepo.count.mockResolvedValue(0);
    actualCostRepo.findOne.mockResolvedValue(null);

    // evaluate() must resolve without throwing
    const result = await service.evaluate(component.id);

    const docCriterion = (result.criteria as ScorecardCriterionResult[]).find(
      (c) => c.id === "has-documentation",
    );

    expect(docCriterion).toBeDefined();
    expect(docCriterion!.notApplicable).toBe(true);

    // Overall score must still be a valid number computed from remaining criteria
    expect(typeof result.overallScore).toBe("number");
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  // ---------------------------------------------------------------------------
  // Test 7 — level assignment thresholds
  // ---------------------------------------------------------------------------

  describe("level assignment thresholds", () => {
    /**
     * Configures all secondary repos with safe zero defaults so individual
     * level-boundary tests only need to override the repos that drive the
     * targeted score range.
     */
    function setupZeroDefaults() {
      documentationRepo.count.mockResolvedValue(0);
      apiSpecRepo.count.mockResolvedValue(0);
      apiSpecRepo.find.mockResolvedValue([]);
      sloRepo.count.mockResolvedValue(0);
      deploymentRepo.find.mockResolvedValue([]);
      containerVulnRepo.count.mockResolvedValue(0);
      resourceViolationRepo.count.mockResolvedValue(0);
      opaResultRepo.count.mockResolvedValue(0);
      iacModuleRepo.count.mockResolvedValue(0);
      iacStackRepo.count.mockResolvedValue(0);
      fluxBindingRepo.count.mockResolvedValue(0);
      actualCostRepo.findOne.mockResolvedValue(null);
    }

    it("should assign NONE when score < 40 (all criteria fail or notApplicable)", async () => {
      // No owner string, no teamId, no description, no links, EXPERIMENTAL
      // lifecycle, no cost budget → essentially every criterion fails or is
      // marked notApplicable.
      const component = makeComponent({
        kind: ComponentKind.LIBRARY,
        owner: "",
        teamId: null as unknown as string,
        description: null as unknown as string,
        links: [],
        lifecycle: ComponentLifecycle.EXPERIMENTAL,
        costBudgetUsd: null as unknown as number,
      });
      componentRepo.findOne.mockResolvedValue(component);
      setupZeroDefaults();

      const result = await service.evaluate(component.id);

      expect(result.level).toBe(ScorecardLevel.NONE);
      expect(result.overallScore).toBeLessThan(40);
    });

    it("should assign BRONZE when score is between 40 and 59", async () => {
      // LIBRARY component — owner, description, docs, links all pass;
      // SLO passes but deployment fails (5/10 = 50%); no security data;
      // IaC passes, GitOps fails; non-production lifecycle;
      // budget set but cost exceeds it.
      //
      // Computed breakdown:
      //   ownershipDocs: 4/4 pass → 100   * 0.25 = 25.00
      //   reliability:   slo passes, deploy fails (50%) → 50 * 0.25 = 12.50
      //   security:      all notApplicable             →  0 * 0.25 =  0.00
      //   infrastructure: iac(0.8) passes only        → 40 * 0.15 =  6.00
      //   cost:          has-budget passes, within fails → 33.33 * 0.10 ≈ 3.33
      //   ──────────────────────────────────────────────────────── ≈ 46.83 → BRONZE
      const component = makeComponent({
        kind: ComponentKind.LIBRARY,
        owner: "my-team",
        description: "desc",
        links: [{ title: "x", url: "https://x.example" }],
        lifecycle: ComponentLifecycle.EXPERIMENTAL,
        costBudgetUsd: 100,
      });
      componentRepo.findOne.mockResolvedValue(component);
      setupZeroDefaults();

      documentationRepo.count.mockResolvedValue(1);
      sloRepo.count.mockResolvedValue(1);
      deploymentRepo.find.mockResolvedValue(makeDeployments(5, 10));
      iacModuleRepo.count.mockResolvedValue(1);
      actualCostRepo.findOne.mockResolvedValue({ totalCost: 200 }); // over budget

      const result = await service.evaluate(component.id);

      expect(result.level).toBe(ScorecardLevel.BRONZE);
      expect(result.overallScore).toBeGreaterThanOrEqual(40);
      expect(result.overallScore).toBeLessThan(60);
    });

    it("should assign SILVER when score is between 60 and 74", async () => {
      // SERVICE component — all ownershipDocs and reliability criteria pass;
      // security is notApplicable (no vuln data); IaC passes, GitOps fails,
      // production lifecycle passes; budget set but cost exceeds it.
      //
      // Computed breakdown:
      //   ownershipDocs: 100  * 0.25 = 25.00
      //   reliability:   100  * 0.25 = 25.00
      //   security:        0  * 0.25 =  0.00
      //   infrastructure: iac(0.8)+lifecycle(0.5)=1.3/2.0 → 65 * 0.15 =  9.75
      //   cost:          has-budget/within → 33.33 * 0.10 ≈  3.33
      //   ──────────────────────────────────────────────────────── ≈ 63.08 → SILVER
      const component = makeComponent({
        kind: ComponentKind.SERVICE,
        lifecycle: ComponentLifecycle.PRODUCTION,
        costBudgetUsd: 100,
      });
      componentRepo.findOne.mockResolvedValue(component);
      setupZeroDefaults();

      documentationRepo.count.mockResolvedValue(1);
      apiSpecRepo.count.mockResolvedValue(1);
      apiSpecRepo.find.mockResolvedValue([{ id: "spec-1" }]);
      const hcQb = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      apiHealthCheckRepo.createQueryBuilder.mockReturnValue(hcQb);
      sloRepo.count.mockResolvedValue(1);
      deploymentRepo.find.mockResolvedValue(makeDeployments(10, 10));
      iacModuleRepo.count.mockResolvedValue(1);
      fluxBindingRepo.count.mockResolvedValue(0); // GitOps fails
      actualCostRepo.findOne.mockResolvedValue({ totalCost: 150 }); // over budget

      const result = await service.evaluate(component.id);

      expect(result.level).toBe(ScorecardLevel.SILVER);
      expect(result.overallScore).toBeGreaterThanOrEqual(60);
      expect(result.overallScore).toBeLessThan(75);
    });

    it("should assign GOLD when score is between 75 and 89", async () => {
      // Same as SILVER scenario but GitOps passes and cost is within budget.
      // Security remains notApplicable (no vuln records) so the score caps at 75.
      //
      // Computed breakdown:
      //   ownershipDocs: 100 * 0.25 = 25
      //   reliability:   100 * 0.25 = 25
      //   security:        0 * 0.25 =  0   (all notApplicable)
      //   infrastructure: 100 * 0.15 = 15
      //   cost:           100 * 0.10 = 10
      //   ──────────────────────────────── = 75.00 → GOLD
      const component = makeComponent({
        kind: ComponentKind.SERVICE,
        lifecycle: ComponentLifecycle.PRODUCTION,
        costBudgetUsd: 200,
      });
      componentRepo.findOne.mockResolvedValue(component);
      setupZeroDefaults();

      documentationRepo.count.mockResolvedValue(1);
      apiSpecRepo.count.mockResolvedValue(1);
      apiSpecRepo.find.mockResolvedValue([{ id: "spec-1" }]);
      const hcQb2 = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      apiHealthCheckRepo.createQueryBuilder.mockReturnValue(hcQb2);
      sloRepo.count.mockResolvedValue(1);
      deploymentRepo.find.mockResolvedValue(makeDeployments(10, 10));
      iacModuleRepo.count.mockResolvedValue(1);
      fluxBindingRepo.count.mockResolvedValue(1); // GitOps passes
      actualCostRepo.findOne.mockResolvedValue({ totalCost: 50 }); // within budget

      const result = await service.evaluate(component.id);

      expect(result.level).toBe(ScorecardLevel.GOLD);
      expect(result.overallScore).toBeGreaterThanOrEqual(75);
      expect(result.overallScore).toBeLessThan(90);
    });

    it("should assign PLATINUM when score >= 90 (all criteria pass including security)", async () => {
      // All criteria applicable and passing.  Security score = 100 because
      // total vuln count > 0 (criteria applicable) yet zero critical/high, and
      // OPA results exist but none are failing.
      //
      // Computed breakdown: 100*0.25 + 100*0.25 + 100*0.25 + 100*0.15 + 100*0.10 = 100 → PLATINUM
      const component = makeComponent({
        kind: ComponentKind.SERVICE,
        lifecycle: ComponentLifecycle.PRODUCTION,
        costBudgetUsd: 200,
      });
      componentRepo.findOne.mockResolvedValue(component);

      documentationRepo.count.mockResolvedValue(1);
      apiSpecRepo.count.mockResolvedValue(1);
      apiSpecRepo.find.mockResolvedValue([{ id: "spec-1" }]);
      const hcQb3 = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      apiHealthCheckRepo.createQueryBuilder.mockReturnValue(hcQb3);
      sloRepo.count.mockResolvedValue(1);
      deploymentRepo.find.mockResolvedValue(makeDeployments(10, 10));

      // Vuln: total > 0 so criteria are applicable, critical=0 and high=0 → pass
      containerVulnRepo.count.mockImplementation(
        ({ where }: { where: Record<string, unknown> }) => {
          if (where.severity === VulnerabilitySeverity.CRITICAL)
            return Promise.resolve(0);
          if (where.severity === VulnerabilitySeverity.HIGH)
            return Promise.resolve(0);
          return Promise.resolve(5); // total > 0
        },
      );
      resourceViolationRepo.count.mockResolvedValue(0);
      // OPA: total=1 so criteria is applicable, failing=0 → pass
      opaResultRepo.count.mockImplementation(
        ({ where }: { where: Record<string, unknown> }) => {
          if (where.allowed === false) return Promise.resolve(0);
          return Promise.resolve(1);
        },
      );

      iacModuleRepo.count.mockResolvedValue(1);
      iacStackRepo.count.mockResolvedValue(0);
      fluxBindingRepo.count.mockResolvedValue(1);
      actualCostRepo.findOne.mockResolvedValue({ totalCost: 50 }); // within budget

      const result = await service.evaluate(component.id);

      expect(result.level).toBe(ScorecardLevel.PLATINUM);
      expect(result.overallScore).toBeGreaterThanOrEqual(90);
    });
  });
});
