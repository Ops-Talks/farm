import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import {
  ScorecardResult,
  ScorecardLevel,
  ScorecardCategoryScores,
  ScorecardCriterionResult,
} from "./entities/scorecard-result.entity";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "../catalog/entities/component.entity";
import { Documentation } from "../documentation/entities/documentation.entity";
import { ApiSpec } from "../api-specs/entities/api-spec.entity";
import { ApiHealthCheck } from "../gateway/entities/api-health-check.entity";
import { Slo } from "../slo/entities/slo.entity";
import {
  Deployment,
  DeploymentStatus,
} from "../environments/entities/deployment.entity";
import { ContainerVulnerability } from "../registry/entities/container-vulnerability.entity";
import { VulnerabilitySeverity } from "../registry/enums/vulnerability-severity.enum";
import { ResourceViolation } from "../tag-policy/entities/resource-violation.entity";
import { OpaResult } from "../opa/entities/opa-result.entity";
import { IacModule } from "../iac/entities/iac-module.entity";
import { IacStack } from "../iac/entities/iac-stack.entity";
import { FluxBinding } from "../kubernetes/entities/flux-binding.entity";
import { ActualCost } from "../finops/entities/actual-cost.entity";

/** Weighted contribution of each category to the overall scorecard score. */
const CATEGORY_WEIGHTS: Record<keyof ScorecardCategoryScores, number> = {
  ownershipDocs: 0.25,
  reliability: 0.25,
  security: 0.25,
  infrastructure: 0.15,
  cost: 0.1,
};

/** Component kinds for which API-spec-related criteria apply. */
const API_SPEC_KINDS: ComponentKind[] = [
  ComponentKind.SERVICE,
  ComponentKind.API,
  ComponentKind.WEBSITE,
];

/**
 * Orchestrates rule-based scorecard evaluation for catalog components.
 *
 * Each of the 16 criteria is evaluated independently. Failures in individual
 * criterion queries are caught and logged; the criterion is then marked as
 * notApplicable so a single data-source outage cannot block the whole run.
 */
@Injectable()
export class ScorecardEvaluatorService {
  private readonly logger = new Logger(ScorecardEvaluatorService.name);

  constructor(
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,

    @InjectRepository(Documentation)
    private readonly documentationRepository: Repository<Documentation>,

    @InjectRepository(ApiSpec)
    private readonly apiSpecRepository: Repository<ApiSpec>,

    @InjectRepository(ApiHealthCheck)
    private readonly apiHealthCheckRepository: Repository<ApiHealthCheck>,

    @InjectRepository(Slo)
    private readonly sloRepository: Repository<Slo>,

    @InjectRepository(Deployment)
    private readonly deploymentRepository: Repository<Deployment>,

    @InjectRepository(ContainerVulnerability)
    private readonly containerVulnerabilityRepository: Repository<ContainerVulnerability>,

    @InjectRepository(ResourceViolation)
    private readonly resourceViolationRepository: Repository<ResourceViolation>,

    @InjectRepository(OpaResult)
    private readonly opaResultRepository: Repository<OpaResult>,

    @InjectRepository(IacModule)
    private readonly iacModuleRepository: Repository<IacModule>,

    @InjectRepository(IacStack)
    private readonly iacStackRepository: Repository<IacStack>,

    @InjectRepository(FluxBinding)
    private readonly fluxBindingRepository: Repository<FluxBinding>,

    @InjectRepository(ActualCost)
    private readonly actualCostRepository: Repository<ActualCost>,
  ) {}

  /**
   * Evaluates all 16 scorecard criteria for the given component and returns a
   * Partial<ScorecardResult> ready to be persisted by ScorecardsService.
   *
   * @param componentId - UUID of the component to evaluate.
   * @param organizationId - Optional organization UUID for scoping.
   * @throws NotFoundException when the component does not exist.
   */
  async evaluate(
    componentId: string,
    organizationId?: string,
  ): Promise<Partial<ScorecardResult>> {
    const component = await this.componentRepository.findOne({
      where: { id: componentId },
    });

    if (!component) {
      throw new NotFoundException(
        `Component with id "${componentId}" not found`,
      );
    }

    const criteria: ScorecardCriterionResult[] = await Promise.all([
      // ownershipDocs
      Promise.resolve(this.evaluateHasOwner(component)),
      Promise.resolve(this.evaluateHasDescription(component)),
      this.evaluateHasDocumentation(component),
      this.evaluateHasApiSpec(component),
      Promise.resolve(this.evaluateHasLinks(component)),
      // reliability
      this.evaluateHasSlo(component),
      this.evaluateDeploymentSuccessRate(component),
      this.evaluateHasHealthCheck(component),
      // security
      this.evaluateNoCriticalVulnerabilities(component),
      this.evaluateNoHighVulnerabilities(component),
      this.evaluateNoPolicyViolations(component),
      // infrastructure
      this.evaluateHasIac(component),
      this.evaluateHasGitops(component),
      Promise.resolve(this.evaluateProductionLifecycle(component)),
      // cost
      Promise.resolve(this.evaluateHasCostBudget(component)),
      this.evaluateWithinCostBudget(component),
    ]);

    const categoryScores = this.computeCategoryScores(criteria);
    const overallScore = this.computeOverallScore(categoryScores);
    const level = this.deriveLevel(overallScore);

    return {
      componentId,
      organizationId,
      overallScore,
      level,
      categoryScores,
      criteria,
      evaluatedAt: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // Category: ownershipDocs
  // ---------------------------------------------------------------------------

  /** Rule 1 — component has a non-empty owner string or a linked team. */
  private evaluateHasOwner(component: Component): ScorecardCriterionResult {
    const passed =
      (typeof component.owner === "string" &&
        component.owner.trim().length > 0) ||
      component.teamId != null;

    return {
      id: "has-owner",
      name: "Has Owner",
      category: "ownershipDocs",
      passed,
      weight: 1.0,
      description:
        "Component must have a non-empty owner string or a linked team.",
    };
  }

  /** Rule 2 — component has a non-empty description. */
  private evaluateHasDescription(
    component: Component,
  ): ScorecardCriterionResult {
    const passed =
      component.description != null && component.description.trim().length > 0;

    return {
      id: "has-description",
      name: "Has Description",
      category: "ownershipDocs",
      passed,
      weight: 0.5,
      description: "Component must have a non-empty description.",
    };
  }

  /** Rule 3 — at least one Documentation record exists for the component. */
  private async evaluateHasDocumentation(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    let passed = false;

    try {
      const count = await this.documentationRepository.count({
        where: { componentId: component.id },
      });
      passed = count > 0;
    } catch (err) {
      this.logger.warn(
        `has-documentation query failed for component ${component.id}: ${String(err)}`,
      );
      return {
        id: "has-documentation",
        name: "Has Documentation",
        category: "ownershipDocs",
        passed: false,
        weight: 0.8,
        description: "Component must have at least one documentation record.",
        notApplicable: true,
      };
    }

    return {
      id: "has-documentation",
      name: "Has Documentation",
      category: "ownershipDocs",
      passed,
      weight: 0.8,
      description: "Component must have at least one documentation record.",
    };
  }

  /**
   * Rule 4 — at least one ApiSpec record exists for the component.
   * Only applicable for SERVICE, API, and WEBSITE kinds.
   */
  private async evaluateHasApiSpec(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    if (!API_SPEC_KINDS.includes(component.kind)) {
      return {
        id: "has-api-spec",
        name: "Has API Spec",
        category: "ownershipDocs",
        passed: false,
        weight: 0.8,
        description:
          "Component must have at least one API specification. Applicable only for SERVICE, API, and WEBSITE kinds.",
        notApplicable: true,
      };
    }

    let passed = false;

    try {
      const count = await this.apiSpecRepository.count({
        where: { componentId: component.id },
      });
      passed = count > 0;
    } catch (err) {
      this.logger.warn(
        `has-api-spec query failed for component ${component.id}: ${String(err)}`,
      );
      return {
        id: "has-api-spec",
        name: "Has API Spec",
        category: "ownershipDocs",
        passed: false,
        weight: 0.8,
        description:
          "Component must have at least one API specification. Applicable only for SERVICE, API, and WEBSITE kinds.",
        notApplicable: true,
      };
    }

    return {
      id: "has-api-spec",
      name: "Has API Spec",
      category: "ownershipDocs",
      passed,
      weight: 0.8,
      description:
        "Component must have at least one API specification. Applicable only for SERVICE, API, and WEBSITE kinds.",
    };
  }

  /** Rule 5 — component has a non-empty links array. */
  private evaluateHasLinks(component: Component): ScorecardCriterionResult {
    const passed = Array.isArray(component.links) && component.links.length > 0;

    return {
      id: "has-links",
      name: "Has Links",
      category: "ownershipDocs",
      passed,
      weight: 0.5,
      description: "Component must have at least one external link.",
    };
  }

  // ---------------------------------------------------------------------------
  // Category: reliability
  // ---------------------------------------------------------------------------

  /** Rule 6 — at least one enabled SLO exists for the component. */
  private async evaluateHasSlo(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    let passed = false;

    try {
      const count = await this.sloRepository.count({
        where: { componentId: component.id, enabled: true },
      });
      passed = count > 0;
    } catch (err) {
      this.logger.warn(
        `has-slo query failed for component ${component.id}: ${String(err)}`,
      );
      return {
        id: "has-slo",
        name: "Has SLO",
        category: "reliability",
        passed: false,
        weight: 1.0,
        description: "Component must have at least one enabled SLO.",
        notApplicable: true,
      };
    }

    return {
      id: "has-slo",
      name: "Has SLO",
      category: "reliability",
      passed,
      weight: 1.0,
      description: "Component must have at least one enabled SLO.",
    };
  }

  /**
   * Rule 7 — deployment success rate over the last 10 deployments is >= 80%.
   * notApplicable when no deployments exist.
   */
  private async evaluateDeploymentSuccessRate(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    const base: Omit<ScorecardCriterionResult, "passed" | "notApplicable"> = {
      id: "deployment-success-rate",
      name: "Deployment Success Rate",
      category: "reliability",
      weight: 1.0,
      description:
        "At least 80% of the last 10 deployments must have succeeded.",
    };

    try {
      const deployments = await this.deploymentRepository.find({
        where: { componentId: component.id },
        order: { createdAt: "DESC" },
        take: 10,
      });

      if (deployments.length === 0) {
        return { ...base, passed: false, notApplicable: true };
      }

      const succeeded = deployments.filter(
        (d) => d.status === DeploymentStatus.SUCCEEDED,
      ).length;

      return { ...base, passed: succeeded / deployments.length >= 0.8 };
    } catch (err) {
      this.logger.warn(
        `deployment-success-rate query failed for component ${component.id}: ${String(err)}`,
      );
      return { ...base, passed: false, notApplicable: true };
    }
  }

  /**
   * Rule 8 — at least one ApiSpec for this component has an associated
   * ApiHealthCheck record. Only applicable for SERVICE, API, and WEBSITE kinds.
   */
  private async evaluateHasHealthCheck(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    const base: Omit<ScorecardCriterionResult, "passed" | "notApplicable"> = {
      id: "has-health-check",
      name: "Has Health Check",
      category: "reliability",
      weight: 0.8,
      description:
        "At least one API spec for the component must have a health check. Applicable only for SERVICE, API, and WEBSITE kinds.",
    };

    if (!API_SPEC_KINDS.includes(component.kind)) {
      return { ...base, passed: false, notApplicable: true };
    }

    try {
      const apiSpecs = await this.apiSpecRepository.find({
        where: { componentId: component.id },
        select: { id: true },
      });

      if (apiSpecs.length === 0) {
        return { ...base, passed: false };
      }

      const apiSpecIds = apiSpecs.map((s) => s.id);

      const healthCheckCount = await this.apiHealthCheckRepository
        .createQueryBuilder("hc")
        .where("hc.apiSpecId IN (:...ids)", { ids: apiSpecIds })
        .getCount();

      return { ...base, passed: healthCheckCount > 0 };
    } catch (err) {
      this.logger.warn(
        `has-health-check query failed for component ${component.id}: ${String(err)}`,
      );
      return { ...base, passed: false, notApplicable: true };
    }
  }

  // ---------------------------------------------------------------------------
  // Category: security
  // ---------------------------------------------------------------------------

  /**
   * Returns the most recently scanned image tag for the component, or null
   * when no vulnerability records exist. Used by both vulnerability criteria
   * so they evaluate only the current image and not stale historical scans.
   */
  private async latestVulnerabilityTag(
    componentId: string,
  ): Promise<string | null> {
    const latest = await this.containerVulnerabilityRepository.findOne({
      where: { componentId },
      order: { scannedAt: "DESC" },
      select: { tag: true },
    });
    return latest?.tag ?? null;
  }

  /**
   * Rule 9 — zero critical-severity container vulnerabilities.
   * Counts only findings for the most recently scanned image tag so that
   * stale CVEs from a superseded tag do not keep this criterion failing.
   * notApplicable when no vulnerability records exist at all for the component.
   */
  private async evaluateNoCriticalVulnerabilities(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    const base: Omit<ScorecardCriterionResult, "passed" | "notApplicable"> = {
      id: "no-critical-vulnerabilities",
      name: "No Critical Vulnerabilities",
      category: "security",
      weight: 1.0,
      description:
        "Component must have zero critical-severity container vulnerabilities.",
    };

    try {
      const latestTag = await this.latestVulnerabilityTag(component.id);

      if (latestTag === null) {
        return { ...base, passed: false, notApplicable: true };
      }

      const criticalCount = await this.containerVulnerabilityRepository.count({
        where: {
          componentId: component.id,
          tag: latestTag,
          severity: VulnerabilitySeverity.CRITICAL,
        },
      });

      return { ...base, passed: criticalCount === 0 };
    } catch (err) {
      this.logger.warn(
        `no-critical-vulnerabilities query failed for component ${component.id}: ${String(err)}`,
      );
      return { ...base, passed: false, notApplicable: true };
    }
  }

  /**
   * Rule 10 — zero high-severity container vulnerabilities.
   * Counts only findings for the most recently scanned image tag so that
   * stale CVEs from a superseded tag do not keep this criterion failing.
   * notApplicable when no vulnerability records exist at all for the component.
   */
  private async evaluateNoHighVulnerabilities(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    const base: Omit<ScorecardCriterionResult, "passed" | "notApplicable"> = {
      id: "no-high-vulnerabilities",
      name: "No High Vulnerabilities",
      category: "security",
      weight: 0.8,
      description:
        "Component must have zero high-severity container vulnerabilities.",
    };

    try {
      const latestTag = await this.latestVulnerabilityTag(component.id);

      if (latestTag === null) {
        return { ...base, passed: false, notApplicable: true };
      }

      const highCount = await this.containerVulnerabilityRepository.count({
        where: {
          componentId: component.id,
          tag: latestTag,
          severity: VulnerabilitySeverity.HIGH,
        },
      });

      return { ...base, passed: highCount === 0 };
    } catch (err) {
      this.logger.warn(
        `no-high-vulnerabilities query failed for component ${component.id}: ${String(err)}`,
      );
      return { ...base, passed: false, notApplicable: true };
    }
  }

  /**
   * Rule 11 — zero resource violations and zero failing OPA policy results.
   *
   * Only active (unresolved) resource tag violations are counted — rows with
   * a non-null `resolvedAt` are excluded. For OPA, only the most recent
   * evaluation per `policyPath` is considered so that a stale denied result
   * does not keep the criterion failing after the component becomes compliant.
   *
   * notApplicable when neither data source has any records for this component.
   */
  private async evaluateNoPolicyViolations(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    const base: Omit<ScorecardCriterionResult, "passed" | "notApplicable"> = {
      id: "no-policy-violations",
      name: "No Policy Violations",
      category: "security",
      weight: 0.8,
      description:
        "Component must have zero resource tag violations and zero failing OPA policy evaluations.",
    };

    try {
      // Count only active (unresolved) tag-policy violations.
      const activeViolationCount = await this.resourceViolationRepository.count(
        {
          where: {
            linkedComponentId: component.id,
            resolvedAt: IsNull(),
          },
        },
      );

      // Fetch all OPA results for the component ordered newest-first, then
      // keep only the latest result per policyPath (in memory — avoids a
      // correlated subquery that differs between SQLite and PostgreSQL).
      type OpaResultRecord = Pick<
        Awaited<ReturnType<typeof this.opaResultRepository.find>>[number],
        "id" | "policyPath" | "allowed" | "evaluatedAt"
      >;
      const allOpaResults: OpaResultRecord[] =
        await this.opaResultRepository.find({
          where: { componentId: component.id },
          order: { evaluatedAt: "DESC" },
          select: {
            id: true,
            policyPath: true,
            allowed: true,
            evaluatedAt: true,
          },
        });

      const latestOpaByPath = new Map<string, OpaResultRecord>();
      for (const result of allOpaResults) {
        if (!latestOpaByPath.has(result.policyPath)) {
          latestOpaByPath.set(result.policyPath, result);
        }
      }

      const opaCount = latestOpaByPath.size;
      const opaFailingCount = Array.from(latestOpaByPath.values()).filter(
        (r) => !r.allowed,
      ).length;

      if (activeViolationCount === 0 && opaCount === 0) {
        return { ...base, passed: false, notApplicable: true };
      }

      return {
        ...base,
        passed: activeViolationCount === 0 && opaFailingCount === 0,
      };
    } catch (err) {
      this.logger.warn(
        `no-policy-violations query failed for component ${component.id}: ${String(err)}`,
      );
      return { ...base, passed: false, notApplicable: true };
    }
  }

  // ---------------------------------------------------------------------------
  // Category: infrastructure
  // ---------------------------------------------------------------------------

  /** Rule 12 — at least one IacModule or IacStack is linked to the component. */
  private async evaluateHasIac(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    const base: Omit<ScorecardCriterionResult, "passed" | "notApplicable"> = {
      id: "has-iac",
      name: "Has IaC",
      category: "infrastructure",
      weight: 0.8,
      description:
        "Component must have at least one linked IaC module or IaC stack.",
    };

    try {
      const [moduleCount, stackCount] = await Promise.all([
        this.iacModuleRepository.count({
          where: { componentId: component.id },
        }),
        this.iacStackRepository.count({
          where: { componentId: component.id },
        }),
      ]);

      return { ...base, passed: moduleCount + stackCount > 0 };
    } catch (err) {
      this.logger.warn(
        `has-iac query failed for component ${component.id}: ${String(err)}`,
      );
      return { ...base, passed: false, notApplicable: true };
    }
  }

  /**
   * Rule 13 — component is managed via GitOps (Flux binding or ArgoCD app).
   *
   * Passes when at least one FluxBinding row exists for the component, or when
   * the component has a non-null `argocdApp` linkage. Both are first-class
   * GitOps paths modelled in FARM.
   */
  private async evaluateHasGitops(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    const base: Omit<ScorecardCriterionResult, "passed" | "notApplicable"> = {
      id: "has-gitops",
      name: "Has GitOps",
      category: "infrastructure",
      weight: 0.7,
      description:
        "Component must have at least one Flux GitOps binding or an ArgoCD application linkage.",
    };

    try {
      // Short-circuit on ArgoCD linkage — no DB query needed.
      if (component.argocdApp) {
        return { ...base, passed: true };
      }

      const count = await this.fluxBindingRepository.count({
        where: { componentId: component.id },
      });

      return { ...base, passed: count > 0 };
    } catch (err) {
      this.logger.warn(
        `has-gitops query failed for component ${component.id}: ${String(err)}`,
      );
      return { ...base, passed: false, notApplicable: true };
    }
  }

  /** Rule 14 — component lifecycle is PRODUCTION. */
  private evaluateProductionLifecycle(
    component: Component,
  ): ScorecardCriterionResult {
    return {
      id: "production-lifecycle",
      name: "Production Lifecycle",
      category: "infrastructure",
      passed: component.lifecycle === ComponentLifecycle.PRODUCTION,
      weight: 0.5,
      description: "Component lifecycle must be set to PRODUCTION.",
    };
  }

  // ---------------------------------------------------------------------------
  // Category: cost
  // ---------------------------------------------------------------------------

  /** Rule 15 — component has a non-null cost budget threshold. */
  private evaluateHasCostBudget(
    component: Component,
  ): ScorecardCriterionResult {
    return {
      id: "has-cost-budget",
      name: "Has Cost Budget",
      category: "cost",
      passed: component.costBudgetUsd != null,
      weight: 0.5,
      description:
        "Component must have a monthly cost budget (costBudgetUsd) configured.",
    };
  }

  /**
   * Rule 16 — the latest actual cost is within the configured budget.
   * notApplicable when costBudgetUsd is not set.
   */
  private async evaluateWithinCostBudget(
    component: Component,
  ): Promise<ScorecardCriterionResult> {
    const base: Omit<ScorecardCriterionResult, "passed" | "notApplicable"> = {
      id: "within-cost-budget",
      name: "Within Cost Budget",
      category: "cost",
      weight: 1.0,
      description:
        "The latest actual cost must not exceed the configured monthly budget.",
    };

    if (component.costBudgetUsd == null) {
      return { ...base, passed: false, notApplicable: true };
    }

    try {
      const latestCost = await this.actualCostRepository.findOne({
        where: { componentId: component.id },
        order: { createdAt: "DESC" },
      });

      if (!latestCost) {
        return { ...base, passed: false, notApplicable: true };
      }

      return {
        ...base,
        passed: latestCost.totalCost <= component.costBudgetUsd,
      };
    } catch (err) {
      this.logger.warn(
        `within-cost-budget query failed for component ${component.id}: ${String(err)}`,
      );
      return { ...base, passed: false, notApplicable: true };
    }
  }

  // ---------------------------------------------------------------------------
  // Score computation helpers
  // ---------------------------------------------------------------------------

  /**
   * Computes per-category scores (0-100) from the list of criterion results.
   * notApplicable criteria are excluded from both numerator and denominator.
   * Returns 0 for a category whose every criterion is notApplicable.
   */
  private computeCategoryScores(
    criteria: ScorecardCriterionResult[],
  ): ScorecardCategoryScores {
    const categories: Array<keyof ScorecardCategoryScores> = [
      "ownershipDocs",
      "reliability",
      "security",
      "infrastructure",
      "cost",
    ];

    const scores = {} as ScorecardCategoryScores;

    for (const category of categories) {
      const applicable = criteria.filter(
        (c) => c.category === category && !c.notApplicable,
      );

      if (applicable.length === 0) {
        scores[category] = 0;
        continue;
      }

      const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);
      const passedWeight = applicable
        .filter((c) => c.passed)
        .reduce((sum, c) => sum + c.weight, 0);

      scores[category] =
        totalWeight > 0 ? (passedWeight / totalWeight) * 100 : 0;
    }

    return scores;
  }

  /**
   * Computes the weighted overall score from per-category scores.
   * Result is rounded to two decimal places.
   */
  private computeOverallScore(categoryScores: ScorecardCategoryScores): number {
    const raw = (
      Object.keys(CATEGORY_WEIGHTS) as Array<keyof ScorecardCategoryScores>
    ).reduce(
      (sum, category) =>
        sum + categoryScores[category] * CATEGORY_WEIGHTS[category],
      0,
    );

    return Math.round(raw * 100) / 100;
  }

  /** Maps a numeric overall score to the corresponding ScorecardLevel. */
  private deriveLevel(score: number): ScorecardLevel {
    if (score >= 90) return ScorecardLevel.PLATINUM;
    if (score >= 75) return ScorecardLevel.GOLD;
    if (score >= 60) return ScorecardLevel.SILVER;
    if (score >= 40) return ScorecardLevel.BRONZE;
    return ScorecardLevel.NONE;
  }
}
