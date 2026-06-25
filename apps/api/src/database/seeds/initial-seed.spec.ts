jest.mock("bcrypt");

import { DataSource, Repository } from "typeorm";
import {
  seedDeployments,
  seedSlos,
  seedAlertingRules,
  seedServiceTemplates,
  seedDocumentation,
  seedOrganization,
  seedDashboard,
  seedPipeline,
  seedIncident,
  seedTagPolicy,
  seedTeams,
  seedComponents,
} from "./initial-seed";
import {
  Deployment,
  DeploymentStatus,
} from "../../modules/environments/entities/deployment.entity";
import {
  Slo,
  SloMetricType,
  SloWindow,
} from "../../modules/slo/entities/slo.entity";
import {
  AlertingRule,
  AlertingSeverity,
} from "../../modules/alerting/entities/alerting-rule.entity";
import { ServiceTemplate } from "../../modules/service-template/entities/service-template.entity";
import { Documentation } from "../../modules/documentation/entities/documentation.entity";
import { Component } from "../../modules/catalog/entities/component.entity";
import { Environment } from "../../modules/environments/entities/environment.entity";
import { Organization } from "../../modules/organization/entities/organization.entity";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";
import {
  Dashboard,
  DashboardVisibility,
} from "../../modules/dashboard/entities/dashboard.entity";
import { DashboardWidget } from "../../modules/dashboard/entities/dashboard-widget.entity";
import { Pipeline } from "../../modules/pipelines/entities/pipeline.entity";
import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "../../modules/incident/entities/incident.entity";
import { TagPolicy } from "../../modules/tag-policy/entities/tag-policy.entity";
import { User } from "../../modules/auth/entities/user.entity";
// FARM-S355 / FARM-S356 -- additional imports for TEST_USERS matrix tests.
// These imports are appended (existing imports above are untouched).
import {
  TEST_USERS as TEST_USERS_MATRIX,
  seedUsers as seedUsersFn,
  seedOrganizations as seedOrganizationsFn,
  runInitialSeed,
} from "./initial-seed";
import { Team } from "../../modules/teams/entities/team.entity";
import * as bcryptLib from "bcrypt";
import { OrgRole } from "@farm/types";

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal mock TypeORM repository with the three methods used by
 * every seed function: findOne, create, and save.
 */
function buildMockRepo<T extends object>(existing: T | null = null) {
  return {
    findOne: jest.fn().mockResolvedValue(existing),
    create: jest
      .fn()
      .mockImplementation(
        (data: Partial<T>) => ({ id: "test-uuid", ...data }) as T,
      ),
    save: jest.fn().mockImplementation((entity: T) => Promise.resolve(entity)),
  } as unknown as jest.Mocked<Repository<T>>;
}

/**
 * Builds a mock DataSource whose getRepository always returns the provided
 * mock repository regardless of which entity class is passed.
 */
function buildMockDataSource<T extends object>(
  repo: jest.Mocked<Repository<T>>,
): DataSource {
  return {
    getRepository: jest.fn().mockReturnValue(repo),
  } as unknown as DataSource;
}

/** Minimal component stub used as input to downstream seed functions. */
function makeComponent(name: string): Component {
  return { id: `${name}-id`, name } as Component;
}

/** Minimal environment stub used as input to downstream seed functions. */
function makeEnvironment(name: string): Environment {
  return { id: `${name}-id`, name } as Environment;
}

/** Minimal organization stub used as input to downstream seed functions. */
function makeOrg(): Organization {
  return { id: "org-id" } as Organization;
}

/** Minimal user stub used as input to downstream seed functions. */
function makeUser(username: string): User {
  return { id: `${username}-id`, username } as User;
}

// ---------------------------------------------------------------------------
// seedDeployments
// ---------------------------------------------------------------------------

describe("seedDeployments", () => {
  const mockOrg = makeOrg();
  const components = {
    "user-service": makeComponent("user-service"),
    "company-portal": makeComponent("company-portal"),
  };
  const environments = {
    development: makeEnvironment("development"),
    staging: makeEnvironment("staging"),
  };

  it("skips all deployments when they already exist", async () => {
    const existing = { id: "existing-id" } as Deployment;
    const repo = buildMockRepo<Deployment>(existing);
    const dataSource = buildMockDataSource(repo);

    await seedDeployments(dataSource, components, environments, mockOrg);

    expect(repo.findOne).toHaveBeenCalledTimes(3);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("creates all deployments when none exist", async () => {
    const repo = buildMockRepo<Deployment>(null);
    const dataSource = buildMockDataSource(repo);

    await seedDeployments(dataSource, components, environments, mockOrg);

    expect(repo.create).toHaveBeenCalledTimes(3);
    expect(repo.save).toHaveBeenCalledTimes(3);
  });

  it("creates a deployment with the correct status and version", async () => {
    const repo = buildMockRepo<Deployment>(null);
    const dataSource = buildMockDataSource(repo);

    await seedDeployments(dataSource, components, environments, mockOrg);

    const firstCall = repo.create.mock.calls[0][0] as Partial<Deployment>;
    expect(firstCall.status).toBe(DeploymentStatus.SUCCEEDED);
    expect(firstCall.version).toBe("1.2.0");
    expect(firstCall.componentId).toBe("user-service-id");
    expect(firstCall.environmentId).toBe("development-id");
  });

  it("skips deployments when the component is missing from the map", async () => {
    const repo = buildMockRepo<Deployment>(null);
    const dataSource = buildMockDataSource(repo);

    await seedDeployments(dataSource, {}, environments, mockOrg);

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// seedSlos
// ---------------------------------------------------------------------------

describe("seedSlos", () => {
  const mockOrg = makeOrg();
  const components = {
    "user-service": makeComponent("user-service"),
    "company-portal": makeComponent("company-portal"),
  };

  it("skips all SLOs when they already exist", async () => {
    const existing = { id: "existing-id" } as Slo;
    const repo = buildMockRepo<Slo>(existing);
    const dataSource = buildMockDataSource(repo);

    await seedSlos(dataSource, components, mockOrg);

    expect(repo.findOne).toHaveBeenCalledTimes(3);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("creates all SLOs when none exist", async () => {
    const repo = buildMockRepo<Slo>(null);
    const dataSource = buildMockDataSource(repo);

    await seedSlos(dataSource, components, mockOrg);

    expect(repo.create).toHaveBeenCalledTimes(3);
    expect(repo.save).toHaveBeenCalledTimes(3);
  });

  it("creates the availability SLO with correct fields", async () => {
    const repo = buildMockRepo<Slo>(null);
    const dataSource = buildMockDataSource(repo);

    await seedSlos(dataSource, components, mockOrg);

    const firstCall = repo.create.mock.calls[0][0] as Partial<Slo>;
    expect(firstCall.name).toBe("user-service-availability");
    expect(firstCall.metricType).toBe(SloMetricType.AVAILABILITY);
    expect(firstCall.targetPercent).toBe(99.9);
    expect(firstCall.window).toBe(SloWindow.THIRTY_DAYS);
    expect(firstCall.componentId).toBe("user-service-id");
  });

  it("creates the latency SLO with a 7-day window", async () => {
    const repo = buildMockRepo<Slo>(null);
    const dataSource = buildMockDataSource(repo);

    await seedSlos(dataSource, components, mockOrg);

    const secondCall = repo.create.mock.calls[1][0] as Partial<Slo>;
    expect(secondCall.name).toBe("user-service-latency-p99");
    expect(secondCall.metricType).toBe(SloMetricType.LATENCY);
    expect(secondCall.window).toBe(SloWindow.SEVEN_DAYS);
  });
});

// ---------------------------------------------------------------------------
// seedAlertingRules
// ---------------------------------------------------------------------------

describe("seedAlertingRules", () => {
  const mockOrg = makeOrg();
  const components = {
    "user-service": makeComponent("user-service"),
  };
  const environments = {
    development: makeEnvironment("development"),
  };

  it("skips all rules when they already exist", async () => {
    const existing = { id: "existing-id" } as AlertingRule;
    const repo = buildMockRepo<AlertingRule>(existing);
    const dataSource = buildMockDataSource(repo);

    await seedAlertingRules(dataSource, components, environments, mockOrg);

    expect(repo.findOne).toHaveBeenCalledTimes(3);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("creates all rules when none exist", async () => {
    const repo = buildMockRepo<AlertingRule>(null);
    const dataSource = buildMockDataSource(repo);

    await seedAlertingRules(dataSource, components, environments, mockOrg);

    expect(repo.create).toHaveBeenCalledTimes(3);
    expect(repo.save).toHaveBeenCalledTimes(3);
  });

  it("creates the critical rule with correct severity and duration", async () => {
    const repo = buildMockRepo<AlertingRule>(null);
    const dataSource = buildMockDataSource(repo);

    await seedAlertingRules(dataSource, components, environments, mockOrg);

    const thirdCall = repo.create.mock.calls[2][0] as Partial<AlertingRule>;
    expect(thirdCall.name).toBe("user-service-down");
    expect(thirdCall.severity).toBe(AlertingSeverity.CRITICAL);
    expect(thirdCall.duration).toBe("1m");
    expect(thirdCall.componentId).toBe("user-service-id");
  });

  it("creates warning rules with the expected query content", async () => {
    const repo = buildMockRepo<AlertingRule>(null);
    const dataSource = buildMockDataSource(repo);

    await seedAlertingRules(dataSource, components, environments, mockOrg);

    const firstCall = repo.create.mock.calls[0][0] as Partial<AlertingRule>;
    expect(firstCall.severity).toBe(AlertingSeverity.WARNING);
    expect(firstCall.query).toContain("user-service");
  });
});

// ---------------------------------------------------------------------------
// seedServiceTemplates
// ---------------------------------------------------------------------------

describe("seedServiceTemplates", () => {
  const mockOrg = makeOrg();

  it("skips all templates when they already exist", async () => {
    const existing = { id: "existing-id" } as ServiceTemplate;
    const repo = buildMockRepo<ServiceTemplate>(existing);
    const dataSource = buildMockDataSource(repo);

    await seedServiceTemplates(dataSource, mockOrg);

    expect(repo.findOne).toHaveBeenCalledTimes(3);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("creates all templates when none exist", async () => {
    const repo = buildMockRepo<ServiceTemplate>(null);
    const dataSource = buildMockDataSource(repo);

    await seedServiceTemplates(dataSource, mockOrg);

    expect(repo.create).toHaveBeenCalledTimes(3);
    expect(repo.save).toHaveBeenCalledTimes(3);
  });

  it("creates nestjs-rest-api as built-in with the organization id", async () => {
    const repo = buildMockRepo<ServiceTemplate>(null);
    const dataSource = buildMockDataSource(repo);

    await seedServiceTemplates(dataSource, mockOrg);

    const firstCall = repo.create.mock.calls[0][0] as Partial<ServiceTemplate>;
    expect(firstCall.name).toBe("nestjs-rest-api");
    expect(firstCall.isBuiltIn).toBe(true);
    expect(firstCall.organizationId).toBe(mockOrg.id);
    expect(firstCall.language).toBe("typescript");
    expect(firstCall.framework).toBe("nestjs");
  });

  it("creates react-web-app with the correct repository URL", async () => {
    const repo = buildMockRepo<ServiceTemplate>(null);
    const dataSource = buildMockDataSource(repo);

    await seedServiceTemplates(dataSource, mockOrg);

    const secondCall = repo.create.mock.calls[1][0] as Partial<ServiceTemplate>;
    expect(secondCall.name).toBe("react-web-app");
    expect(secondCall.repositoryUrl).toBe(
      "https://github.com/farm-templates/react-web-app",
    );
  });

  it("creates python-fastapi with an enum variable including database options", async () => {
    const repo = buildMockRepo<ServiceTemplate>(null);
    const dataSource = buildMockDataSource(repo);

    await seedServiceTemplates(dataSource, mockOrg);

    const thirdCall = repo.create.mock.calls[2][0] as Partial<ServiceTemplate>;
    expect(thirdCall.name).toBe("python-fastapi");
    expect(thirdCall.variables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "databaseType",
          type: "enum",
          options: ["postgresql", "better-sqlite3", "mysql"],
        }),
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// seedDocumentation
// ---------------------------------------------------------------------------

describe("seedDocumentation", () => {
  const mockOrg = makeOrg();
  const components = {
    "user-service": makeComponent("user-service"),
  };

  it("skips all docs when they already exist", async () => {
    const existing = { id: "existing-id" } as Documentation;
    const repo = buildMockRepo<Documentation>(existing);
    const dataSource = buildMockDataSource(repo);

    await seedDocumentation(dataSource, components, mockOrg);

    expect(repo.findOne).toHaveBeenCalledTimes(2);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("creates all docs when none exist", async () => {
    const repo = buildMockRepo<Documentation>(null);
    const dataSource = buildMockDataSource(repo);

    await seedDocumentation(dataSource, components, mockOrg);

    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it("creates Getting Started with order 0 and correct componentId", async () => {
    const repo = buildMockRepo<Documentation>(null);
    const dataSource = buildMockDataSource(repo);

    await seedDocumentation(dataSource, components, mockOrg);

    const firstCall = repo.create.mock.calls[0][0] as Partial<Documentation>;
    expect(firstCall.title).toBe("Getting Started");
    expect(firstCall.order).toBe(0);
    expect(firstCall.componentId).toBe("user-service-id");
    expect(firstCall.author).toBe("admin");
    expect(firstCall.version).toBe("1.0.0");
  });

  it("creates API Reference with order 1", async () => {
    const repo = buildMockRepo<Documentation>(null);
    const dataSource = buildMockDataSource(repo);

    await seedDocumentation(dataSource, components, mockOrg);

    const secondCall = repo.create.mock.calls[1][0] as Partial<Documentation>;
    expect(secondCall.title).toBe("API Reference");
    expect(secondCall.order).toBe(1);
  });

  it("skips docs when the component is not found in the map", async () => {
    const repo = buildMockRepo<Documentation>(null);
    const dataSource = buildMockDataSource(repo);

    await seedDocumentation(dataSource, {}, mockOrg);

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// seedOrganization
// ---------------------------------------------------------------------------

describe("seedOrganization", () => {
  const adminUser = makeUser("admin");
  const users: Record<string, User> = { admin: adminUser };

  it("skips org creation when the organization already exists", async () => {
    const existingOrg = { id: "existing-org-id" } as Organization;
    const orgRepo = buildMockRepo<Organization>(existingOrg);
    const userOrgRepo = buildMockRepo<UserOrganization>(null);

    const dataSource = {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Organization) return orgRepo;
        if (entity === UserOrganization) return userOrgRepo;
        return buildMockRepo(null);
      }),
    } as unknown as DataSource;

    await seedOrganization(dataSource, users);

    expect(orgRepo.create).not.toHaveBeenCalled();
    expect(orgRepo.save).not.toHaveBeenCalled();
  });

  it("creates org and UserOrganization membership when neither exists", async () => {
    const orgRepo = buildMockRepo<Organization>(null);
    const userOrgRepo = buildMockRepo<UserOrganization>(null);

    const dataSource = {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Organization) return orgRepo;
        if (entity === UserOrganization) return userOrgRepo;
        return buildMockRepo(null);
      }),
    } as unknown as DataSource;

    const result = await seedOrganization(dataSource, users);

    expect(orgRepo.create).toHaveBeenCalledTimes(1);
    expect(orgRepo.save).toHaveBeenCalledTimes(1);
    expect(userOrgRepo.create).toHaveBeenCalledTimes(1);
    expect(userOrgRepo.save).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it("skips UserOrganization creation when membership already exists", async () => {
    const orgRepo = buildMockRepo<Organization>(null);
    const existingMembership = { id: "membership-id" } as UserOrganization;
    const userOrgRepo = buildMockRepo<UserOrganization>(existingMembership);

    const dataSource = {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Organization) return orgRepo;
        if (entity === UserOrganization) return userOrgRepo;
        return buildMockRepo(null);
      }),
    } as unknown as DataSource;

    await seedOrganization(dataSource, users);

    expect(orgRepo.create).toHaveBeenCalledTimes(1);
    expect(userOrgRepo.create).not.toHaveBeenCalled();
    expect(userOrgRepo.save).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// seedDashboard
// ---------------------------------------------------------------------------

describe("seedDashboard", () => {
  const mockOrg = makeOrg();
  const users: Record<string, User> = { admin: makeUser("admin") };

  it("skips dashboard and widgets when the dashboard already exists", async () => {
    const existingDashboard = { id: "existing-dashboard-id" } as Dashboard;
    const dashboardRepo = buildMockRepo<Dashboard>(existingDashboard);
    const widgetRepo = buildMockRepo<DashboardWidget>(null);

    const dataSource = {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Dashboard) return dashboardRepo;
        if (entity === DashboardWidget) return widgetRepo;
        return buildMockRepo(null);
      }),
    } as unknown as DataSource;

    await seedDashboard(dataSource, users, mockOrg);

    expect(dashboardRepo.create).not.toHaveBeenCalled();
    expect(widgetRepo.create).not.toHaveBeenCalled();
    expect(widgetRepo.save).not.toHaveBeenCalled();
  });

  it("creates the dashboard and exactly 4 widgets when none exist", async () => {
    const dashboardRepo = buildMockRepo<Dashboard>(null);
    const widgetRepo = buildMockRepo<DashboardWidget>(null);

    const dataSource = {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Dashboard) return dashboardRepo;
        if (entity === DashboardWidget) return widgetRepo;
        return buildMockRepo(null);
      }),
    } as unknown as DataSource;

    await seedDashboard(dataSource, users, mockOrg);

    expect(dashboardRepo.create).toHaveBeenCalledTimes(1);
    expect(dashboardRepo.save).toHaveBeenCalledTimes(1);
    expect(widgetRepo.create).toHaveBeenCalledTimes(4);
    expect(widgetRepo.save).toHaveBeenCalledTimes(4);
  });

  it("sets dashboardId on each widget matching the saved dashboard id", async () => {
    const dashboardRepo = buildMockRepo<Dashboard>(null);
    const widgetRepo = buildMockRepo<DashboardWidget>(null);

    const dataSource = {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Dashboard) return dashboardRepo;
        if (entity === DashboardWidget) return widgetRepo;
        return buildMockRepo(null);
      }),
    } as unknown as DataSource;

    await seedDashboard(dataSource, users, mockOrg);

    for (const call of widgetRepo.create.mock.calls) {
      const widgetData = call[0] as Partial<DashboardWidget>;
      expect(widgetData.dashboardId).toBe("test-uuid");
    }
  });

  it("creates dashboard with WORKSPACE visibility and correct ownerId", async () => {
    const dashboardRepo = buildMockRepo<Dashboard>(null);
    const widgetRepo = buildMockRepo<DashboardWidget>(null);

    const dataSource = {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Dashboard) return dashboardRepo;
        if (entity === DashboardWidget) return widgetRepo;
        return buildMockRepo(null);
      }),
    } as unknown as DataSource;

    await seedDashboard(dataSource, users, mockOrg);

    const dashboardCall = dashboardRepo.create.mock
      .calls[0][0] as Partial<Dashboard>;
    expect(dashboardCall.visibility).toBe(DashboardVisibility.WORKSPACE);
    expect(dashboardCall.ownerId).toBe("admin-id");
    expect(dashboardCall.organizationId).toBe("org-id");
  });
});

// ---------------------------------------------------------------------------
// seedPipeline
// ---------------------------------------------------------------------------

describe("seedPipeline", () => {
  const mockOrg = makeOrg();
  const users: Record<string, User> = { admin: makeUser("admin") };

  it("skips pipeline creation when it already exists", async () => {
    const existing = { id: "existing-pipeline-id" } as Pipeline;
    const repo = buildMockRepo<Pipeline>(existing);
    const dataSource = buildMockDataSource(repo);

    await seedPipeline(dataSource, users, mockOrg);

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("creates the pipeline when it does not exist", async () => {
    const repo = buildMockRepo<Pipeline>(null);
    const dataSource = buildMockDataSource(repo);

    await seedPipeline(dataSource, users, mockOrg);

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("creates pipeline with exactly 4 stages and correct createdBy", async () => {
    const repo = buildMockRepo<Pipeline>(null);
    const dataSource = buildMockDataSource(repo);

    await seedPipeline(dataSource, users, mockOrg);

    const pipelineCall = repo.create.mock.calls[0][0] as Partial<Pipeline>;
    expect(pipelineCall.stages).toHaveLength(4);
    expect(pipelineCall.createdBy).toBe("admin-id");
    expect(pipelineCall.organizationId).toBe("org-id");
  });
});

// ---------------------------------------------------------------------------
// seedIncident
// ---------------------------------------------------------------------------

describe("seedIncident", () => {
  const mockOrg = makeOrg();
  const components = { "user-service": makeComponent("user-service") };
  const environments = { staging: makeEnvironment("staging") };

  it("skips incident creation when it already exists", async () => {
    const existing = { id: "existing-incident-id" } as Incident;
    const repo = buildMockRepo<Incident>(existing);
    const dataSource = buildMockDataSource(repo);

    await seedIncident(dataSource, components, environments, mockOrg);

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("creates a resolved P2 incident with affectedComponents and affectedEnvironments set before save", async () => {
    const repo = buildMockRepo<Incident>(null);
    const dataSource = buildMockDataSource(repo);

    await seedIncident(dataSource, components, environments, mockOrg);

    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledTimes(1);

    const savedEntity = repo.save.mock.calls[0][0] as Partial<Incident>;
    expect(savedEntity.status).toBe(IncidentStatus.RESOLVED);
    expect(savedEntity.severity).toBe(IncidentSeverity.P2);
    expect(savedEntity.affectedComponents).toEqual([
      components["user-service"],
    ]);
    expect(savedEntity.affectedEnvironments).toEqual([environments["staging"]]);
  });

  it("does not set affectedComponents when the component key is absent from the map", async () => {
    const repo = buildMockRepo<Incident>(null);
    const dataSource = buildMockDataSource(repo);

    await seedIncident(dataSource, {}, environments, mockOrg);

    const savedEntity = repo.save.mock.calls[0][0] as Partial<Incident>;
    expect(savedEntity.affectedComponents).toBeUndefined();
    expect(savedEntity.affectedEnvironments).toEqual([environments["staging"]]);
  });
});

// ---------------------------------------------------------------------------
// seedTagPolicy
// ---------------------------------------------------------------------------

describe("seedTagPolicy", () => {
  const mockOrg = makeOrg();

  it("skips both policies when they already exist", async () => {
    const existing = { id: "existing-policy-id" } as TagPolicy;
    const repo = buildMockRepo<TagPolicy>(existing);
    const dataSource = buildMockDataSource(repo);

    await seedTagPolicy(dataSource, mockOrg);

    expect(repo.findOne).toHaveBeenCalledTimes(2);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("creates both policies when neither exists", async () => {
    const repo = buildMockRepo<TagPolicy>(null);
    const dataSource = buildMockDataSource(repo);

    await seedTagPolicy(dataSource, mockOrg);

    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it("creates k8s-deployment policy with the correct requiredKeys", async () => {
    const repo = buildMockRepo<TagPolicy>(null);
    const dataSource = buildMockDataSource(repo);

    await seedTagPolicy(dataSource, mockOrg);

    const firstCall = repo.create.mock.calls[0][0] as Partial<TagPolicy>;
    expect(firstCall.resourceType).toBe("k8s-deployment");
    expect(firstCall.requiredKeys).toEqual([
      "app.kubernetes.io/name",
      "app.kubernetes.io/version",
      "owner",
    ]);
    expect(firstCall.severity).toBe("warning");
  });

  it("creates the wildcard policy with the correct requiredKeys", async () => {
    const repo = buildMockRepo<TagPolicy>(null);
    const dataSource = buildMockDataSource(repo);

    await seedTagPolicy(dataSource, mockOrg);

    const secondCall = repo.create.mock.calls[1][0] as Partial<TagPolicy>;
    expect(secondCall.resourceType).toBe("*");
    expect(secondCall.requiredKeys).toEqual(["owner", "team"]);
  });
});

// ---------------------------------------------------------------------------
// seedTeams
// ---------------------------------------------------------------------------

describe("seedTeams", () => {
  const mockOrg = makeOrg();

  it("skips update and logs 'already exists' when team exists and has an organizationId", async () => {
    const existingTeam = {
      id: "team-id",
      name: "platform-team",
      organizationId: "org-id",
    } as unknown as import("../../modules/teams/entities/team.entity").Team;
    const repo = buildMockRepo(existingTeam);
    const dataSource = buildMockDataSource(repo);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedTeams(dataSource, mockOrg);
    consoleSpy.mockRestore();

    // save should NOT have been called because organizationId is already set
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("patches organizationId and calls save when team exists but organizationId is null", async () => {
    const existingTeam = {
      id: "team-id",
      name: "platform-team",
      organizationId: null,
    } as unknown as import("../../modules/teams/entities/team.entity").Team;
    const repo = buildMockRepo(existingTeam);
    const dataSource = buildMockDataSource(repo);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedTeams(dataSource, mockOrg);
    consoleSpy.mockRestore();

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: mockOrg.id }),
    );
  });

  it("creates team when it does not exist", async () => {
    const repo =
      buildMockRepo<import("../../modules/teams/entities/team.entity").Team>(
        null,
      );
    const dataSource = buildMockDataSource(repo);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedTeams(dataSource, mockOrg);
    consoleSpy.mockRestore();

    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// seedComponents
// ---------------------------------------------------------------------------

describe("seedComponents", () => {
  const mockOrg = makeOrg();
  const mockTeams = {
    "platform-team": {
      id: "platform-id",
      name: "platform-team",
    } as unknown as import("../../modules/catalog/entities/component.entity").Component,
    "backend-team": {
      id: "backend-id",
      name: "backend-team",
    } as unknown as import("../../modules/catalog/entities/component.entity").Component,
  };

  it("skips update and logs 'already exists' when component exists and has an organizationId", async () => {
    const existingComponent = {
      id: "comp-id",
      name: "user-service",
      organizationId: "org-id",
    } as unknown as import("../../modules/catalog/entities/component.entity").Component;
    const repo = buildMockRepo(existingComponent);
    const dataSource = buildMockDataSource(repo);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedComponents(dataSource, mockTeams as never, mockOrg);
    consoleSpy.mockRestore();

    expect(repo.save).not.toHaveBeenCalled();
  });

  it("patches organizationId and calls save when component exists but organizationId is null", async () => {
    const existingComponent = {
      id: "comp-id",
      name: "user-service",
      organizationId: null,
    } as unknown as import("../../modules/catalog/entities/component.entity").Component;
    const repo = buildMockRepo(existingComponent);
    const dataSource = buildMockDataSource(repo);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedComponents(dataSource, mockTeams as never, mockOrg);
    consoleSpy.mockRestore();

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: mockOrg.id }),
    );
  });

  it("creates component when it does not exist", async () => {
    const repo =
      buildMockRepo<
        import("../../modules/catalog/entities/component.entity").Component
      >(null);
    const dataSource = buildMockDataSource(repo);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedComponents(dataSource, mockTeams as never, mockOrg);
    consoleSpy.mockRestore();

    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// FARM-S355 / FARM-S356 -- TEST_USERS matrix and seedUsers reconciliation
// ---------------------------------------------------------------------------

describe("TEST_USERS matrix (FARM-S355 / FARM-S356)", () => {
  const TEST_USERS = TEST_USERS_MATRIX as unknown as Record<
    string,
    {
      username: string;
      email: string;
      password: string;
      displayName: string;
      roles: readonly string[];
      memberships: ReadonlyArray<{ orgSlug: string; role: OrgRole }>;
      teamSlugs: readonly string[];
    }
  >;
  const bcrypt = bcryptLib;

  function buildRoutedDataSource(repos: {
    user?: jest.Mocked<Repository<User>>;
    org?: jest.Mocked<Repository<Organization>>;
    userOrg?: jest.Mocked<Repository<UserOrganization>>;
    team?: jest.Mocked<Repository<unknown>>;
  }): DataSource {
    return {
      getRepository: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === User) return repos.user ?? buildMockRepo(null);
        if (entity === Organization) return repos.org ?? buildMockRepo(null);
        if (entity === UserOrganization)
          return repos.userOrg ?? buildMockRepo(null);
        if (entity === Team) return repos.team ?? buildMockRepo(null);
        return buildMockRepo(null);
      }),
    } as unknown as DataSource;
  }

  it("ST417: exposes the seven canonical personas with passwords >= 8 chars and non-empty memberships", () => {
    const expectedKeys = [
      "platformAdmin",
      "orgOwner",
      "orgAdmin",
      "orgMember",
      "crossOrgMember",
      "teamLead",
      "viewer",
    ];
    expect(Object.keys(TEST_USERS).sort()).toEqual([...expectedKeys].sort());
    for (const key of expectedKeys) {
      expect(TEST_USERS[key]).toBeDefined();
      expect(typeof TEST_USERS[key].password).toBe("string");
      expect(TEST_USERS[key].password.length).toBeGreaterThanOrEqual(8);
      expect(Array.isArray(TEST_USERS[key].memberships)).toBe(true);
      expect(TEST_USERS[key].memberships.length).toBeGreaterThan(0);
    }
  });

  it("ST416: creates seven personas, OrgRole-correct memberships, and team rows from an empty DB", async () => {
    const userRepo = buildMockRepo<User>(null);
    (userRepo.create as jest.Mock).mockImplementation((data: Partial<User>) => {
      return { id: `${data.username}-id`, ...data } as User;
    });
    (userRepo.save as jest.Mock).mockImplementation((u: User) =>
      Promise.resolve(u),
    );

    const userOrgRepo = buildMockRepo<UserOrganization>(null);
    const orgRepo = buildMockRepo<Organization>(null);

    const platformTeam = {
      id: "platform-team-id",
      name: "platform-team",
      members: [] as User[],
    };
    const backendTeam = {
      id: "backend-team-id",
      name: "backend-team",
      members: [] as User[],
    };
    const teamRepo = {
      findOne: jest
        .fn()
        .mockImplementation((opts: { where: { name: string } }) => {
          if (opts.where.name === "platform-team") return platformTeam;
          if (opts.where.name === "backend-team") return backendTeam;
          return null;
        }),
      create: jest.fn(),
      save: jest.fn().mockImplementation((t: unknown) => Promise.resolve(t)),
    } as unknown as jest.Mocked<Repository<unknown>>;

    const orgs: Record<string, Organization> = {
      "farm-demo": { id: "farm-demo-id", slug: "farm-demo" } as Organization,
      "org-b": { id: "org-b-id", slug: "org-b" } as Organization,
    };

    const dataSource = buildRoutedDataSource({
      user: userRepo,
      org: orgRepo,
      userOrg: userOrgRepo,
      team: teamRepo,
    });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const result = await seedUsersFn(dataSource, orgs);
    consoleSpy.mockRestore();

    const personas = Object.values(TEST_USERS);
    expect(Object.keys(result)).toHaveLength(personas.length);
    for (const persona of personas) {
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: persona.username,
          roles: [...persona.roles],
        }),
      );
    }

    // Every declared persona membership must result in a userOrgRepo.create
    // call with the persona's declared OrgRole (not a derived OWNER/MEMBER
    // value computed by the seed).
    for (const persona of personas) {
      for (const membership of persona.memberships) {
        expect(userOrgRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: `${persona.username}-id`,
            organizationId: orgs[membership.orgSlug].id,
            role: membership.role,
          }),
        );
      }
    }

    // Spot-check the new OrgRoles that did not exist in the legacy matrix.
    const userOrgCreateCalls = (userOrgRepo.create as jest.Mock).mock
      .calls as Array<[{ userId: string; role: OrgRole }]>;
    expect(userOrgCreateCalls.some((c) => c[0].role === OrgRole.ADMIN)).toBe(
      true,
    );
    expect(
      userOrgCreateCalls.some(
        (c) => c[0].userId === "org-owner-id" && c[0].role === OrgRole.OWNER,
      ),
    ).toBe(true);
    expect(userOrgRepo.save).toHaveBeenCalled();

    const teamSaveCalls = (teamRepo.save as jest.Mock).mock.calls as Array<
      [unknown]
    >;
    const savedTeamNames = teamSaveCalls.map(
      (c) => (c[0] as { name: string }).name,
    );
    expect(savedTeamNames).toEqual(
      expect.arrayContaining(["backend-team", "platform-team"]),
    );

    const backendSave = teamSaveCalls.find(
      (c) => (c[0] as { name: string }).name === "backend-team",
    ) as [{ members: User[] }];
    expect(
      backendSave[0].members.some((m) => m.username === "org-member"),
    ).toBe(true);

    const platformSave = teamSaveCalls.find(
      (c) => (c[0] as { name: string }).name === "platform-team",
    ) as [{ members: User[] }];
    expect(
      platformSave[0].members.some((m) => m.username === "team-lead"),
    ).toBe(true);
  });

  it("ST416 (multi-tenant): crossOrgMember receives one UserOrganization per declared membership", async () => {
    const userRepo = buildMockRepo<User>(null);
    (userRepo.create as jest.Mock).mockImplementation((data: Partial<User>) => {
      return { id: `${data.username}-id`, ...data } as User;
    });
    (userRepo.save as jest.Mock).mockImplementation((u: User) =>
      Promise.resolve(u),
    );
    const userOrgRepo = buildMockRepo<UserOrganization>(null);
    const orgRepo = buildMockRepo<Organization>(null);
    const teamRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<unknown>>;

    const orgs: Record<string, Organization> = {
      "farm-demo": { id: "farm-demo-id", slug: "farm-demo" } as Organization,
      "org-b": { id: "org-b-id", slug: "org-b" } as Organization,
    };

    const dataSource = buildRoutedDataSource({
      user: userRepo,
      org: orgRepo,
      userOrg: userOrgRepo,
      team: teamRepo,
    });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedUsersFn(dataSource, orgs);
    consoleSpy.mockRestore();

    const userOrgCreateCalls = (userOrgRepo.create as jest.Mock).mock
      .calls as Array<
      [{ userId: string; organizationId: string; role: OrgRole }]
    >;
    const crossOrgRows = userOrgCreateCalls.filter(
      (c) => c[0].userId === "cross-org-member-id",
    );
    expect(crossOrgRows).toHaveLength(2);
    const targetOrgs = crossOrgRows.map((c) => c[0].organizationId).sort();
    expect(targetOrgs).toEqual(["farm-demo-id", "org-b-id"].sort());
    for (const row of crossOrgRows) {
      expect(row[0].role).toBe(OrgRole.MEMBER);
    }
  });

  it("ST418: adds missing org membership for an existing org-member", async () => {
    const existingMember = {
      id: "existing-org-member-id",
      username: "org-member",
      roles: ["user"],
    } as User;

    const userRepo = {
      findOne: jest
        .fn()
        .mockImplementation((opts: { where: { username: string } }) =>
          opts.where.username === "org-member" ? existingMember : null,
        ),
      create: jest
        .fn()
        .mockImplementation(
          (data: Partial<User>) =>
            ({ id: `${data.username}-id`, ...data }) as User,
        ),
      save: jest.fn().mockImplementation((u: User) => Promise.resolve(u)),
    } as unknown as jest.Mocked<Repository<User>>;

    const userOrgRepo = buildMockRepo<UserOrganization>(null);
    const orgRepo = buildMockRepo<Organization>(null);
    const teamRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<unknown>>;

    const orgs: Record<string, Organization> = {
      "farm-demo": { id: "farm-demo-id", slug: "farm-demo" } as Organization,
      "org-b": { id: "org-b-id", slug: "org-b" } as Organization,
    };

    const dataSource = buildRoutedDataSource({
      user: userRepo,
      org: orgRepo,
      userOrg: userOrgRepo,
      team: teamRepo,
    });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedUsersFn(dataSource, orgs);
    consoleSpy.mockRestore();

    const userOrgCreateCalls = (userOrgRepo.create as jest.Mock).mock
      .calls as Array<[unknown]>;
    const memberOrgCreate = userOrgCreateCalls.find(
      (c) => (c[0] as { userId: string }).userId === "existing-org-member-id",
    );
    expect(memberOrgCreate).toBeDefined();
    expect(memberOrgCreate![0]).toEqual(
      expect.objectContaining({
        userId: "existing-org-member-id",
        organizationId: orgs["farm-demo"].id,
        role: OrgRole.MEMBER,
      }),
    );
    expect(userOrgRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "existing-org-member-id",
        organizationId: orgs["farm-demo"].id,
        role: OrgRole.MEMBER,
      }),
    );

    for (const r of TEST_USERS.orgMember.roles) {
      expect(existingMember.roles).toContain(r);
    }
  });

  it("ST418: merges new persona roles into the existing user when roles diverge", async () => {
    const existingAdmin = {
      id: "existing-admin-id",
      username: "admin",
      roles: ["legacy-role"],
    } as User;

    const userRepo = {
      findOne: jest
        .fn()
        .mockImplementation((opts: { where: { username: string } }) =>
          opts.where.username === "admin" ? existingAdmin : null,
        ),
      create: jest
        .fn()
        .mockImplementation(
          (data: Partial<User>) =>
            ({ id: `${data.username}-id`, ...data }) as User,
        ),
      save: jest.fn().mockImplementation((u: User) => Promise.resolve(u)),
    } as unknown as jest.Mocked<Repository<User>>;

    const userOrgRepo = buildMockRepo<UserOrganization>(null);
    const orgRepo = buildMockRepo<Organization>(null);
    const teamRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<unknown>>;

    const orgs: Record<string, Organization> = {
      "farm-demo": { id: "farm-demo-id", slug: "farm-demo" } as Organization,
      "org-b": { id: "org-b-id", slug: "org-b" } as Organization,
    };

    const dataSource = buildRoutedDataSource({
      user: userRepo,
      org: orgRepo,
      userOrg: userOrgRepo,
      team: teamRepo,
    });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedUsersFn(dataSource, orgs);
    consoleSpy.mockRestore();

    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "admin",
        roles: expect.arrayContaining([
          "legacy-role",
          "admin",
        ]) as readonly string[],
      }),
    );
  });

  describe("ST419: password reset gated by SEED_RESET_PASSWORDS", () => {
    const originalEnv = process.env.SEED_RESET_PASSWORDS;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.SEED_RESET_PASSWORDS;
      } else {
        process.env.SEED_RESET_PASSWORDS = originalEnv;
      }
    });

    it("preserves existing password when SEED_RESET_PASSWORDS is unset", async () => {
      delete process.env.SEED_RESET_PASSWORDS;
      const preservedHash = "$2b$10$preservedHashShouldNotChange.aaaaaaaaaaaa";
      const existingMember = {
        id: "existing-org-member-id",
        username: "org-member",
        roles: ["user"],
        password: preservedHash,
      } as User;

      const userRepo = {
        findOne: jest
          .fn()
          .mockImplementation((opts: { where: { username: string } }) =>
            opts.where.username === "org-member" ? existingMember : null,
          ),
        create: jest
          .fn()
          .mockImplementation(
            (data: Partial<User>) =>
              ({ id: `${data.username}-id`, ...data }) as User,
          ),
        save: jest.fn().mockImplementation((u: User) => Promise.resolve(u)),
      } as unknown as jest.Mocked<Repository<User>>;

      const dataSource = buildRoutedDataSource({ user: userRepo });

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      await seedUsersFn(dataSource);
      consoleSpy.mockRestore();

      const memberSaves = (
        (userRepo.save as jest.Mock).mock.calls as Array<[unknown]>
      ).filter((c) => (c[0] as User).username === "org-member");
      for (const call of memberSaves) {
        expect((call[0] as User).password).toBe(preservedHash);
      }
      expect(existingMember.password).toBe(preservedHash);
    });

    it("rewrites password with a fresh bcrypt hash when SEED_RESET_PASSWORDS=true", async () => {
      process.env.SEED_RESET_PASSWORDS = "true";
      const existingMember = {
        id: "existing-org-member-id",
        username: "org-member",
        roles: ["user"],
        password: "$2b$10$oldHash.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      } as User;

      const userRepo = {
        findOne: jest
          .fn()
          .mockImplementation((opts: { where: { username: string } }) =>
            opts.where.username === "org-member" ? existingMember : null,
          ),
        create: jest
          .fn()
          .mockImplementation(
            (data: Partial<User>) =>
              ({ id: `${data.username}-id`, ...data }) as User,
          ),
        save: jest.fn().mockImplementation((u: User) => Promise.resolve(u)),
      } as unknown as jest.Mocked<Repository<User>>;

      const dataSource = buildRoutedDataSource({ user: userRepo });

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      await seedUsersFn(dataSource);
      consoleSpy.mockRestore();

      const memberSaves = (
        (userRepo.save as jest.Mock).mock.calls as Array<[unknown]>
      ).filter((c) => (c[0] as User).username === "org-member");
      expect(memberSaves.length).toBeGreaterThan(0);
      const savedHash = (memberSaves[0][0] as User).password;
      expect(savedHash).toMatch(/^\$2[aby]\$/);
      expect(bcrypt.compareSync(TEST_USERS.orgMember.password, savedHash)).toBe(
        true,
      );
    });
  });

  it("seedOrganizations creates farm-demo and org-b on an empty DB", async () => {
    const orgRepo = buildMockRepo<Organization>(null);
    (orgRepo.create as jest.Mock).mockImplementation(
      (data: Partial<Organization>) =>
        ({ id: `${data.slug}-id`, ...data }) as Organization,
    );
    const dataSource = buildRoutedDataSource({ org: orgRepo });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const result = await seedOrganizationsFn(dataSource);
    consoleSpy.mockRestore();

    expect(Object.keys(result).sort()).toEqual(["farm-demo", "org-b"]);
    expect(orgRepo.create).toHaveBeenCalledTimes(2);
    expect(orgRepo.save).toHaveBeenCalledTimes(2);
  });

  it("seedOrganizations patches description when org exists without one", async () => {
    const existingOrg = {
      id: "x",
      slug: "farm-demo",
      name: "Farm Demo",
      description: null,
    } as Organization;
    const orgRepo = buildMockRepo<Organization>(existingOrg);
    (orgRepo.save as jest.Mock).mockImplementation((o: Organization) =>
      Promise.resolve(o),
    );
    const dataSource = buildRoutedDataSource({ org: orgRepo });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedOrganizationsFn(dataSource);
    consoleSpy.mockRestore();

    // save is called to patch description on both orgs (both have null description in the mock)
    expect(orgRepo.save).toHaveBeenCalled();
  });

  it("seedOrganizations skips org that already has a description", async () => {
    const existingOrg = {
      id: "x",
      slug: "farm-demo",
      name: "Farm Demo",
      description: "existing desc",
    } as Organization;
    const orgRepo = buildMockRepo<Organization>(existingOrg);
    const dataSource = buildRoutedDataSource({ org: orgRepo });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await seedOrganizationsFn(dataSource);
    consoleSpy.mockRestore();

    // no save because org already has a description
    expect(orgRepo.save).not.toHaveBeenCalled();
  });

  it("runInitialSeed completes without throwing on a fresh empty DB", async () => {
    const repo = buildMockRepo<object>(null);
    (repo.create as jest.Mock).mockImplementation(
      (data: Record<string, unknown>) => ({ id: "seed-uuid", ...data }),
    );
    (repo.save as jest.Mock).mockImplementation((e: unknown) =>
      Promise.resolve(e),
    );
    const dataSource = buildMockDataSource(repo);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(runInitialSeed(dataSource)).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});
