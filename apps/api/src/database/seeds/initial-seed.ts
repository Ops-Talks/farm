import { DataSource } from "typeorm";
import { User } from "../../modules/auth/entities/user.entity";
import { Organization } from "../../modules/organization/entities/organization.entity";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";
import { OrgRole } from "@farm/types";
import { Team, TeamType } from "../../modules/teams/entities/team.entity";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "../../modules/catalog/entities/component.entity";
import {
  Environment,
  EnvironmentType,
} from "../../modules/environments/entities/environment.entity";
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
import {
  Dashboard,
  DashboardVisibility,
} from "../../modules/dashboard/entities/dashboard.entity";
import {
  DashboardWidget,
  WidgetType,
} from "../../modules/dashboard/entities/dashboard-widget.entity";
import {
  Pipeline,
  PipelineStage,
} from "../../modules/pipelines/entities/pipeline.entity";
import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "../../modules/incident/entities/incident.entity";
import { TagPolicy } from "../../modules/tag-policy/entities/tag-policy.entity";
import * as bcrypt from "bcrypt";

/**
 * Persona membership: pair of organization slug and the OrgRole the persona
 * holds inside that organization. Personas may declare multiple memberships
 * to model multi-tenant users (for example, SSO accounts that belong to two
 * organizations at once).
 */
export type PersonaMembership = {
  orgSlug: string;
  role: OrgRole;
};

/**
 * Canonical persona matrix used for permission-scope tests and local seeding.
 *
 * Each persona is named by its TEST PURPOSE -- the combination of global
 * `roles` and per-tenant `OrgRole`(s) that it exercises -- rather than by
 * the tenant it lives in. This makes it explicit which authorization axis
 * a given persona is meant to exercise:
 *
 * | personaKey       | username           | roles     | memberships                                     | teams           |
 * |------------------|--------------------|-----------|-------------------------------------------------|-----------------|
 * | platformAdmin    | admin              | [admin]   | farm-demo: OWNER                                | -               |
 * | orgOwner         | org-owner          | [user]    | org-b: OWNER                                    | -               |
 * | orgAdmin         | org-admin          | [user]    | farm-demo: ADMIN                                | -               |
 * | orgMember        | org-member         | [user]    | farm-demo: MEMBER                               | backend-team    |
 * | crossOrgMember   | cross-org-member   | [user]    | farm-demo: MEMBER, org-b: MEMBER                | -               |
 * | teamLead         | team-lead          | [user]    | farm-demo: MEMBER                               | platform-team   |
 * | viewer           | viewer             | [user]    | farm-demo: MEMBER                               | -               |
 *
 * The `username` of `platformAdmin` is preserved as `admin` for backward
 * compatibility with well-known dev flows and with legacy seed helpers
 * (`seedOrganization`, `seedDashboard`, `seedPipeline`) that still reference
 * `users["admin"]`.
 *
 * Every persona's password is at least 8 characters long. `memberships` and
 * `teamSlugs` are referenced by `seedUsers` to idempotently reconcile
 * `UserOrganization` and `team_members` rows. Organization ownership is
 * derived from this matrix: an organization's `ownerId` is patched to the
 * id of the first persona whose membership for that slug has role OWNER.
 */
export const TEST_USERS = {
  platformAdmin: {
    username: "admin",
    email: "admin@farm.dev",
    password: "Admin1234",
    displayName: "Platform Admin",
    roles: ["admin"],
    memberships: [
      { orgSlug: "farm-demo", role: OrgRole.OWNER },
    ] as PersonaMembership[],
    teamSlugs: [] as string[],
  },
  orgOwner: {
    username: "org-owner",
    email: "org-owner@farm.dev",
    password: "OrgOwner1",
    displayName: "Org B Owner",
    roles: ["user"],
    memberships: [
      { orgSlug: "org-b", role: OrgRole.OWNER },
    ] as PersonaMembership[],
    teamSlugs: [] as string[],
  },
  orgAdmin: {
    username: "org-admin",
    email: "org-admin@farm.dev",
    password: "OrgAdmin1",
    displayName: "Farm Demo Admin",
    roles: ["user"],
    memberships: [
      { orgSlug: "farm-demo", role: OrgRole.ADMIN },
    ] as PersonaMembership[],
    teamSlugs: [] as string[],
  },
  orgMember: {
    username: "org-member",
    email: "org-member@farm.dev",
    password: "OrgMember1",
    displayName: "Farm Demo Member",
    roles: ["user"],
    memberships: [
      { orgSlug: "farm-demo", role: OrgRole.MEMBER },
    ] as PersonaMembership[],
    teamSlugs: ["backend-team"] as string[],
  },
  crossOrgMember: {
    username: "cross-org-member",
    email: "cross-org-member@farm.dev",
    password: "CrossOrg1",
    displayName: "Cross-Org Member",
    roles: ["user"],
    memberships: [
      { orgSlug: "farm-demo", role: OrgRole.MEMBER },
      { orgSlug: "org-b", role: OrgRole.MEMBER },
    ] as PersonaMembership[],
    teamSlugs: [] as string[],
  },
  teamLead: {
    username: "team-lead",
    email: "team-lead@farm.dev",
    password: "TeamLead1",
    displayName: "Platform Team Lead",
    roles: ["user"],
    memberships: [
      { orgSlug: "farm-demo", role: OrgRole.MEMBER },
    ] as PersonaMembership[],
    teamSlugs: ["platform-team"] as string[],
  },
  viewer: {
    username: "viewer",
    email: "viewer@farm.dev",
    password: "Viewer1234",
    displayName: "Read-only Viewer",
    roles: ["user"],
    memberships: [
      { orgSlug: "farm-demo", role: OrgRole.MEMBER },
    ] as PersonaMembership[],
    teamSlugs: [] as string[],
  },
} as const;

/**
 * Runs the initial seed: admin user, organization, teams, components,
 * environments, deployments, SLOs, alerting rules, service templates,
 * documentation, dashboard, pipeline, incident, and tag policies.
 * Idempotent -- skips records that already exist (checked by unique fields).
 *
 * Ordering note: `seedOrganizations` runs first with a null `ownerId` for any
 * organization whose owning persona has not been created yet. `seedUsers`
 * then creates/reconciles all personas and patches the owning organization's
 * `ownerId` field post-hoc. This avoids the chicken-and-egg coupling between
 * org ownership and user creation.
 */
export async function runInitialSeed(dataSource: DataSource): Promise<void> {
  const orgs = await seedOrganizations(dataSource);
  const teams = await seedTeams(dataSource, orgs["farm-demo"]);
  const users = await seedUsers(dataSource, orgs);
  const org = orgs["farm-demo"];
  const components = await seedComponents(dataSource, teams, org);
  const environments = await seedEnvironments(dataSource, org);
  await seedDeployments(dataSource, components, environments, org);
  await seedSlos(dataSource, components, org);
  await seedAlertingRules(dataSource, components, environments, org);
  await seedServiceTemplates(dataSource, org);
  await seedDocumentation(dataSource, components, org);
  await seedDashboard(dataSource, users, org);
  await seedPipeline(dataSource, users, org);
  await seedIncident(dataSource, components, environments, org);
  await seedTagPolicy(dataSource, org);
}

export async function seedUsers(
  dataSource: DataSource,
  organizations?: Record<string, Organization>,
): Promise<Record<string, User>> {
  const repo = dataSource.getRepository(User);
  const userOrgRepo = dataSource.getRepository(UserOrganization);
  const teamRepo = dataSource.getRepository(Team);
  const orgRepo = dataSource.getRepository(Organization);
  const result: Record<string, User> = {};

  const resetPasswords = process.env.SEED_RESET_PASSWORDS === "true";

  for (const personaKey of Object.keys(TEST_USERS) as Array<
    keyof typeof TEST_USERS
  >) {
    const persona = TEST_USERS[personaKey];
    let user = await repo.findOne({ where: { username: persona.username } });

    if (!user) {
      user = repo.create({
        username: persona.username,
        email: persona.email,
        password: persona.password,
        displayName: persona.displayName,
        roles: [...persona.roles],
      });
      user = await repo.save(user);
      console.log(
        `  Created user "${persona.username}" (${persona.roles.join(", ")})`,
      );
    } else {
      // Reconcile existing user: merge roles using set semantics, optionally
      // reset password when SEED_RESET_PASSWORDS=true.
      const existingRoles = Array.isArray(user.roles) ? user.roles : [];
      const mergedRoles = Array.from(
        new Set([...existingRoles, ...persona.roles]),
      );
      let mutated = false;
      if (mergedRoles.length !== existingRoles.length) {
        user.roles = mergedRoles;
        mutated = true;
      }
      if (resetPasswords) {
        // Hash explicitly: TypeORM lifecycle hooks do not run reliably under
        // mocks, and we want a deterministic bcrypt hash on disk.
        user.password = await bcrypt.hash(persona.password, 10);
        mutated = true;
      }
      if (mutated) {
        user = await repo.save(user);
        console.log(`  Reconciled user "${persona.username}"`);
      } else {
        console.log(`  User "${persona.username}" already up to date.`);
      }
    }

    result[persona.username] = user;
  }

  // Reconcile organization memberships and ownerIds, plus team memberships.
  if (organizations) {
    for (const personaKey of Object.keys(TEST_USERS) as Array<
      keyof typeof TEST_USERS
    >) {
      const persona = TEST_USERS[personaKey];
      const user = result[persona.username];

      for (const membership of persona.memberships) {
        const org = organizations[membership.orgSlug];
        if (!org) continue;

        const existing = await userOrgRepo.findOne({
          where: { userId: user.id, organizationId: org.id },
        });
        if (!existing) {
          const created = userOrgRepo.create({
            userId: user.id,
            organizationId: org.id,
            role: membership.role,
          });
          await userOrgRepo.save(created);
          console.log(
            `  Created membership ${persona.username} -> ${membership.orgSlug} (${membership.role})`,
          );
        }
      }

      for (const teamSlug of persona.teamSlugs) {
        const team = await teamRepo.findOne({
          where: { name: teamSlug },
          relations: ["members"],
        });
        if (!team) continue;
        const members = Array.isArray(team.members) ? team.members : [];
        const alreadyMember = members.some((m) => m.id === user.id);
        if (!alreadyMember) {
          team.members = [...members, user];
          await teamRepo.save(team);
          console.log(`  Added ${persona.username} to team "${teamSlug}"`);
        }
      }
    }

    // Patch ownerId on organizations whose ownerId is still null. The owner
    // is derived from TEST_USERS: the first persona declaring an OWNER
    // membership for a given slug becomes that organization's owner.
    for (const orgSlug of Object.keys(organizations)) {
      const org = organizations[orgSlug];
      if (org.ownerId) continue;
      const ownerPersonaKey = (
        Object.keys(TEST_USERS) as Array<keyof typeof TEST_USERS>
      ).find((key) =>
        TEST_USERS[key].memberships.some(
          (m) => m.orgSlug === orgSlug && m.role === OrgRole.OWNER,
        ),
      );
      if (!ownerPersonaKey) continue;
      const ownerUser = result[TEST_USERS[ownerPersonaKey].username];
      if (!ownerUser) continue;
      org.ownerId = ownerUser.id;
      await orgRepo.save(org);
      console.log(`  Patched ownerId on org "${orgSlug}"`);
    }
  }

  return result;
}

/**
 * Seeds all permission-scope test organizations.
 *
 * Creates `farm-demo` and `org-b` with `ownerId` initially null. The owner
 * for each organization is patched in `seedUsers` once the corresponding
 * persona has been created. This avoids a chicken-and-egg problem between
 * organization ownership and user creation.
 *
 * Idempotent: re-running patches missing `description` and a null `ownerId`
 * but never overwrites operator-managed fields.
 */
export async function seedOrganizations(
  dataSource: DataSource,
): Promise<Record<string, Organization>> {
  const orgRepo = dataSource.getRepository(Organization);
  const seeds = [
    {
      name: "Farm Demo",
      slug: "farm-demo",
      description: "Default demo organization created by the initial seed",
    },
    {
      name: "Org B",
      slug: "org-b",
      description: "Secondary organization for permission scope tests",
    },
  ];

  const result: Record<string, Organization> = {};
  for (const seed of seeds) {
    let org = await orgRepo.findOne({ where: { slug: seed.slug } });
    if (!org) {
      org = orgRepo.create({
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        ownerId: null,
        settings: null,
      });
      org = await orgRepo.save(org);
      console.log(`  Created organization "${seed.name}"`);
    } else if (!org.description && seed.description) {
      org.description = seed.description;
      org = await orgRepo.save(org);
      console.log(`  Patched description on org "${seed.slug}"`);
    } else {
      console.log(`  Organization "${seed.name}" already exists, skipping.`);
    }
    result[seed.slug] = org;
  }
  return result;
}

/**
 * Seeds the default demo organization and links the admin user as owner.
 * Uniqueness is checked by the organization slug.
 *
 * Retained for backward compatibility with callers that explicitly want a
 * single-organization seeding flow; `runInitialSeed` uses
 * `seedOrganizations` instead.
 */
export async function seedOrganization(
  dataSource: DataSource,
  users: Record<string, User>,
): Promise<Organization> {
  const orgRepo = dataSource.getRepository(Organization);

  let org = await orgRepo.findOne({ where: { slug: "farm-demo" } });
  if (org) {
    console.log(`  Organization "Farm Demo" already exists, skipping.`);
  } else {
    org = orgRepo.create({
      name: "Farm Demo",
      slug: "farm-demo",
      description: "Default demo organization created by the initial seed",
      ownerId: users["admin"].id,
      settings: null,
    });
    org = await orgRepo.save(org);
    console.log(`  Created organization "Farm Demo"`);
  }

  const userOrgRepo = dataSource.getRepository(UserOrganization);
  const membershipExists = await userOrgRepo.findOne({
    where: { userId: users["admin"].id, organizationId: org.id },
  });
  if (membershipExists) {
    console.log(`  Membership admin -> Farm Demo already exists, skipping.`);
  } else {
    const userOrg = userOrgRepo.create({
      userId: users["admin"].id,
      organizationId: org.id,
      role: OrgRole.OWNER,
    });
    await userOrgRepo.save(userOrg);
    console.log(`  Created membership admin -> Farm Demo (owner)`);
  }

  return org;
}

export async function seedTeams(
  dataSource: DataSource,
  org: Organization,
): Promise<Record<string, Team>> {
  const repo = dataSource.getRepository(Team);
  const result: Record<string, Team> = {};

  const teams = [
    {
      name: "platform-team",
      displayName: "Platform Team",
      description:
        "Maintains the developer platform and shared infrastructure.",
      type: TeamType.PLATFORM,
      contactEmail: "platform@farm.dev",
      slackChannel: "#platform",
    },
    {
      name: "backend-team",
      displayName: "Backend Team",
      description: "Develops and maintains backend services and APIs.",
      type: TeamType.DEV,
      contactEmail: "backend@farm.dev",
      slackChannel: "#backend",
    },
  ];

  for (const teamData of teams) {
    let team = await repo.findOne({ where: { name: teamData.name } });
    if (team) {
      if (!team.organizationId) {
        team.organizationId = org.id;
        team = await repo.save(team);
        console.log(`  Updated team "${teamData.name}" with organizationId.`);
      } else {
        console.log(`  Team "${teamData.name}" already exists, skipping.`);
      }
    } else {
      team = repo.create({ ...teamData, organizationId: org.id });
      team = await repo.save(team);
      console.log(`  Created team "${teamData.name}"`);
    }
    result[teamData.name] = team;
  }

  return result;
}

export async function seedComponents(
  dataSource: DataSource,
  teams: Record<string, Team>,
  org: Organization,
): Promise<Record<string, Component>> {
  const repo = dataSource.getRepository(Component);
  const result: Record<string, Component> = {};

  const components = [
    {
      name: "user-service",
      kind: ComponentKind.SERVICE,
      description:
        "Handles user authentication, registration, and profile management.",
      owner: "backend-team",
      lifecycle: ComponentLifecycle.PRODUCTION,
      tags: ["backend", "auth", "rest-api"],
      team: teams["backend-team"],
    },
    {
      name: "shared-ui-library",
      kind: ComponentKind.LIBRARY,
      description:
        "Reusable React component library used across frontend applications.",
      owner: "platform-team",
      lifecycle: ComponentLifecycle.PRODUCTION,
      tags: ["frontend", "react", "shared"],
      team: teams["platform-team"],
    },
    {
      name: "company-portal",
      kind: ComponentKind.WEBSITE,
      description: "Public-facing company website with documentation and blog.",
      owner: "platform-team",
      lifecycle: ComponentLifecycle.EXPERIMENTAL,
      tags: ["frontend", "website", "public"],
      team: teams["platform-team"],
    },
  ];

  for (const componentData of components) {
    let component = await repo.findOne({
      where: { name: componentData.name },
    });
    if (component) {
      if (!component.organizationId) {
        component.organizationId = org.id;
        component = await repo.save(component);
        console.log(
          `  Updated component "${componentData.name}" with organizationId.`,
        );
      } else {
        console.log(
          `  Component "${componentData.name}" already exists, skipping.`,
        );
      }
    } else {
      component = repo.create({ ...componentData, organizationId: org.id });
      component = await repo.save(component);
      console.log(
        `  Created component "${componentData.name}" (${componentData.kind})`,
      );
    }
    result[componentData.name] = component;
  }

  return result;
}

async function seedEnvironments(
  dataSource: DataSource,
  org: Organization,
): Promise<Record<string, Environment>> {
  const repo = dataSource.getRepository(Environment);
  const result: Record<string, Environment> = {};

  const environments = [
    {
      name: "development",
      type: EnvironmentType.DEVELOPMENT,
      description: "Local and shared development environment.",
      order: 0,
    },
    {
      name: "staging",
      type: EnvironmentType.STAGING,
      description: "Pre-production environment for integration testing.",
      order: 1,
    },
  ];

  for (const envData of environments) {
    let env = await repo.findOne({ where: { name: envData.name } });
    if (env) {
      console.log(`  Environment "${envData.name}" already exists, skipping.`);
    } else {
      env = repo.create({ ...envData, organizationId: org.id });
      env = await repo.save(env);
      console.log(`  Created environment "${envData.name}" (${envData.type})`);
    }
    result[envData.name] = env;
  }

  return result;
}

/**
 * Seeds demo deployment records for existing components and environments.
 * Uniqueness is checked by the (componentId, environmentId) pair.
 * Note: the Deployment entity has no organizationId column; the org param
 * is accepted for API consistency but is intentionally unused here.
 */
export async function seedDeployments(
  dataSource: DataSource,
  components: Record<string, Component>,
  environments: Record<string, Environment>,
  org: Organization,
): Promise<void> {
  const repo = dataSource.getRepository(Deployment);

  // Deployment entity has no organizationId column.
  void org;

  const deployments = [
    {
      componentKey: "user-service",
      environmentKey: "development",
      status: DeploymentStatus.SUCCEEDED,
      version: "1.2.0",
    },
    {
      componentKey: "user-service",
      environmentKey: "staging",
      status: DeploymentStatus.SUCCEEDED,
      version: "1.1.3",
    },
    {
      componentKey: "company-portal",
      environmentKey: "development",
      status: DeploymentStatus.SUCCEEDED,
      version: "0.9.1",
    },
  ];

  for (const deploymentData of deployments) {
    const component = components[deploymentData.componentKey];
    const environment = environments[deploymentData.environmentKey];

    if (!component || !environment) {
      console.log(
        `  Deployment for "${deploymentData.componentKey}" in "${deploymentData.environmentKey}" skipped — missing component or environment.`,
      );
      continue;
    }

    const componentId = component.id;
    const environmentId = environment.id;
    const label = `${deploymentData.componentKey}@${deploymentData.version} -> ${deploymentData.environmentKey}`;

    const exists = await repo.findOne({
      where: { componentId, environmentId },
    });
    if (exists) {
      console.log(`  Deployment "${label}" already exists, skipping.`);
      continue;
    }

    const deployment = repo.create({
      componentId,
      environmentId,
      status: deploymentData.status,
      version: deploymentData.version,
    });
    await repo.save(deployment);
    console.log(`  Created deployment "${label}"`);
  }
}

/**
 * Seeds demo SLO definitions scoped to existing components.
 * Uniqueness is checked by the SLO name.
 */
export async function seedSlos(
  dataSource: DataSource,
  components: Record<string, Component>,
  org: Organization,
): Promise<void> {
  const repo = dataSource.getRepository(Slo);

  const slos = [
    {
      name: "user-service-availability",
      metricType: SloMetricType.AVAILABILITY,
      targetPercent: 99.9,
      window: SloWindow.THIRTY_DAYS,
      componentKey: "user-service",
    },
    {
      name: "user-service-latency-p99",
      metricType: SloMetricType.LATENCY,
      targetPercent: 99.0,
      window: SloWindow.SEVEN_DAYS,
      componentKey: "user-service",
    },
    {
      name: "company-portal-availability",
      metricType: SloMetricType.AVAILABILITY,
      targetPercent: 99.5,
      window: SloWindow.THIRTY_DAYS,
      componentKey: "company-portal",
    },
  ];

  for (const sloData of slos) {
    const exists = await repo.findOne({ where: { name: sloData.name } });
    if (exists) {
      console.log(`  SLO "${sloData.name}" already exists, skipping.`);
      continue;
    }

    const component = components[sloData.componentKey];
    const slo = repo.create({
      name: sloData.name,
      metricType: sloData.metricType,
      targetPercent: sloData.targetPercent,
      window: sloData.window,
      componentId: component?.id ?? null,
      organizationId: org.id,
    });
    await repo.save(slo);
    console.log(`  Created SLO "${sloData.name}"`);
  }
}

/**
 * Seeds demo alerting rules scoped to existing components.
 * Uniqueness is checked by the rule name.
 */
export async function seedAlertingRules(
  dataSource: DataSource,
  components: Record<string, Component>,
  environments: Record<string, Environment>,
  org: Organization,
): Promise<void> {
  const repo = dataSource.getRepository(AlertingRule);

  // environments param is reserved for future environment-scoped rules.
  void environments;

  const rules = [
    {
      name: "user-service-high-error-rate",
      query:
        'sum(rate(http_requests_total{job="user-service",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="user-service"}[5m])) > 0.05',
      duration: "5m",
      severity: AlertingSeverity.WARNING,
      componentKey: "user-service",
    },
    {
      name: "user-service-high-latency",
      query:
        'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="user-service"}[5m])) by (le)) > 1',
      duration: "10m",
      severity: AlertingSeverity.WARNING,
      componentKey: "user-service",
    },
    {
      name: "user-service-down",
      query: 'up{job="user-service"} == 0',
      duration: "1m",
      severity: AlertingSeverity.CRITICAL,
      componentKey: "user-service",
    },
  ];

  for (const ruleData of rules) {
    const exists = await repo.findOne({ where: { name: ruleData.name } });
    if (exists) {
      console.log(
        `  AlertingRule "${ruleData.name}" already exists, skipping.`,
      );
      continue;
    }

    const component = components[ruleData.componentKey];
    const rule = repo.create({
      name: ruleData.name,
      query: ruleData.query,
      duration: ruleData.duration,
      severity: ruleData.severity,
      componentId: component?.id ?? null,
      organizationId: org.id,
    });
    await repo.save(rule);
    console.log(`  Created AlertingRule "${ruleData.name}"`);
  }
}

/**
 * Seeds built-in service templates shipped with the platform.
 * Uniqueness is checked by the template name.
 */
export async function seedServiceTemplates(
  dataSource: DataSource,
  org: Organization,
): Promise<void> {
  const repo = dataSource.getRepository(ServiceTemplate);

  const templates = [
    {
      name: "nestjs-rest-api",
      language: "typescript",
      framework: "nestjs",
      description:
        "Production-ready NestJS REST API with TypeORM, Swagger, and JWT authentication",
      repositoryUrl: "https://github.com/farm-templates/nestjs-rest-api",
      tags: ["backend", "api", "typescript", "nestjs"],
      isBuiltIn: true,
      organizationId: org.id,
      variables: [
        {
          key: "serviceName",
          label: "Service Name",
          description: "Name of the new service (kebab-case)",
          required: true,
          type: "string" as const,
          placeholder: "my-service",
        },
        {
          key: "databaseEnabled",
          label: "Enable Database",
          description: "Include TypeORM database integration",
          required: false,
          type: "boolean" as const,
          default: "true",
        },
      ],
    },
    {
      name: "react-web-app",
      language: "typescript",
      framework: "react",
      description: "Next.js web application with Tailwind CSS and TypeScript",
      repositoryUrl: "https://github.com/farm-templates/react-web-app",
      tags: ["frontend", "react", "nextjs", "typescript"],
      isBuiltIn: true,
      organizationId: org.id,
      variables: [
        {
          key: "appName",
          label: "Application Name",
          description: "Name of the web application (kebab-case)",
          required: true,
          type: "string" as const,
          placeholder: "my-app",
        },
        {
          key: "authEnabled",
          label: "Enable Authentication",
          description: "Include authentication integration",
          required: false,
          type: "boolean" as const,
          default: "false",
        },
      ],
    },
    {
      name: "python-fastapi",
      language: "python",
      framework: "fastapi",
      description:
        "FastAPI microservice with Pydantic models, async SQLAlchemy, and OpenAPI docs",
      repositoryUrl: "https://github.com/farm-templates/python-fastapi",
      tags: ["backend", "api", "python", "fastapi"],
      isBuiltIn: true,
      organizationId: org.id,
      variables: [
        {
          key: "serviceName",
          label: "Service Name",
          description: "Name of the new service (snake_case)",
          required: true,
          type: "string" as const,
          placeholder: "my_service",
        },
        {
          key: "databaseType",
          label: "Database Type",
          description: "Database backend to use",
          required: false,
          type: "enum" as const,
          options: ["postgresql", "sqlite", "mysql"],
          default: "postgresql",
        },
      ],
    },
  ];

  for (const templateData of templates) {
    const exists = await repo.findOne({ where: { name: templateData.name } });
    if (exists) {
      console.log(
        `  ServiceTemplate "${templateData.name}" already exists, skipping.`,
      );
      continue;
    }
    const template = repo.create(templateData);
    await repo.save(template);
    console.log(`  Created ServiceTemplate "${templateData.name}"`);
  }
}

/**
 * Seeds demo documentation entries linked to existing components.
 * Uniqueness is checked by the (title, componentId) pair.
 */
export async function seedDocumentation(
  dataSource: DataSource,
  components: Record<string, Component>,
  org: Organization,
): Promise<void> {
  const repo = dataSource.getRepository(Documentation);

  const docs = [
    {
      title: "Getting Started",
      sourceUrl:
        "https://raw.githubusercontent.com/farm-templates/nestjs-rest-api/main/docs/getting-started.md",
      author: "admin",
      version: "1.0.0",
      componentKey: "user-service",
      order: 0,
    },
    {
      title: "API Reference",
      sourceUrl:
        "https://raw.githubusercontent.com/farm-templates/nestjs-rest-api/main/docs/api-reference.md",
      author: "admin",
      version: "1.0.0",
      componentKey: "user-service",
      order: 1,
    },
  ];

  for (const docData of docs) {
    const component = components[docData.componentKey];

    if (!component) {
      console.log(
        `  Documentation "${docData.title}" skipped — component "${docData.componentKey}" not found.`,
      );
      continue;
    }

    const componentId = component.id;
    const exists = await repo.findOne({
      where: { title: docData.title, componentId },
    });
    if (exists) {
      console.log(
        `  Documentation "${docData.title}" already exists, skipping.`,
      );
      continue;
    }

    const doc = repo.create({
      title: docData.title,
      sourceUrl: docData.sourceUrl,
      author: docData.author,
      version: docData.version,
      componentId,
      order: docData.order,
      organizationId: org.id,
    });
    await repo.save(doc);
    console.log(`  Created documentation "${docData.title}"`);
  }
}

/**
 * Seeds a default "Platform Overview" dashboard with 4 widgets.
 * Uniqueness is checked by the dashboard name.
 */
export async function seedDashboard(
  dataSource: DataSource,
  users: Record<string, User>,
  org: Organization,
): Promise<void> {
  const dashboardRepo = dataSource.getRepository(Dashboard);

  const exists = await dashboardRepo.findOne({
    where: { name: "Platform Overview" },
  });
  if (exists) {
    console.log(`  Dashboard "Platform Overview" already exists, skipping.`);
    return;
  }

  const dashboard = dashboardRepo.create({
    name: "Platform Overview",
    description: "High-level health and activity across platform components",
    ownerId: users["admin"].id,
    visibility: DashboardVisibility.WORKSPACE,
    organizationId: org.id,
  });
  const savedDashboard = await dashboardRepo.save(dashboard);
  console.log(`  Created dashboard "Platform Overview"`);

  const widgetRepo = dataSource.getRepository(DashboardWidget);

  const widgets: Array<{
    title: string;
    type: WidgetType;
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    config: Record<string, unknown>;
  }> = [
    {
      title: "SLO Status",
      type: WidgetType.SLO_GAUGE,
      gridX: 0,
      gridY: 0,
      gridW: 4,
      gridH: 3,
      config: { metricName: "user-service-availability" },
    },
    {
      title: "Recent Deployments",
      type: WidgetType.DEPLOYMENT_FEED,
      gridX: 4,
      gridY: 0,
      gridW: 4,
      gridH: 3,
      config: { limit: 10 },
    },
    {
      title: "Component Health",
      type: WidgetType.COMPONENT_HEALTH,
      gridX: 8,
      gridY: 0,
      gridW: 4,
      gridH: 3,
      config: {},
    },
    {
      title: "Active Alerts",
      type: WidgetType.ALERT_SUMMARY,
      gridX: 0,
      gridY: 3,
      gridW: 6,
      gridH: 3,
      config: { severity: "critical" },
    },
  ];

  for (const widgetData of widgets) {
    const widget = widgetRepo.create({
      ...widgetData,
      dashboardId: savedDashboard.id,
    });
    await widgetRepo.save(widget);
    console.log(`  Created widget "${widgetData.title}"`);
  }
}

/**
 * Seeds a demo pipeline definition with 4 ordered stages.
 * Uniqueness is checked by the pipeline name.
 */
export async function seedPipeline(
  dataSource: DataSource,
  users: Record<string, User>,
  org: Organization,
): Promise<void> {
  const repo = dataSource.getRepository(Pipeline);

  const exists = await repo.findOne({
    where: { name: "deploy-to-staging" },
  });
  if (exists) {
    console.log(`  Pipeline "deploy-to-staging" already exists, skipping.`);
    return;
  }

  const stages: PipelineStage[] = [
    {
      id: "stage-build",
      name: "Build",
      type: "build",
      order: 0,
      config: { command: "npm run build", image: "node:20-alpine" },
    },
    {
      id: "stage-test",
      name: "Test",
      type: "script",
      order: 1,
      config: { command: "npm test -- --ci", image: "node:20-alpine" },
    },
    {
      id: "stage-approval",
      name: "Approval Gate",
      type: "approval",
      order: 2,
      config: { requiredApprovers: 1, timeoutMinutes: 60 },
    },
    {
      id: "stage-deploy",
      name: "Deploy to Staging",
      type: "deploy",
      order: 3,
      config: { environment: "staging", strategy: "rolling" },
    },
  ];

  const pipeline = repo.create({
    name: "deploy-to-staging",
    description:
      "Builds, validates, and deploys the main service to the staging environment",
    createdBy: users["admin"].id,
    organizationId: org.id,
    stages,
  });
  await repo.save(pipeline);
  console.log(`  Created pipeline "deploy-to-staging"`);
}

/**
 * Seeds a resolved demo incident linked to the user-service and staging environment.
 * Uniqueness is checked by the incident title.
 */
export async function seedIncident(
  dataSource: DataSource,
  components: Record<string, Component>,
  environments: Record<string, Environment>,
  org: Organization,
): Promise<void> {
  const repo = dataSource.getRepository(Incident);

  const incidentTitle = "user-service elevated error rate";

  const exists = await repo.findOne({ where: { title: incidentTitle } });
  if (exists) {
    console.log(`  Incident "${incidentTitle}" already exists, skipping.`);
    return;
  }

  const incident = repo.create({
    title: incidentTitle,
    description:
      "The user-service reported a 12% HTTP 500 error rate during peak traffic. " +
      "Root cause identified as a misconfigured connection pool. " +
      "Resolved by increasing pool size and deploying a hotfix.",
    severity: IncidentSeverity.P2,
    status: IncidentStatus.RESOLVED,
    organizationId: org.id,
    resolvedAt: new Date("2024-03-15T14:30:00.000Z"),
  });

  const affectedComponents = components["user-service"]
    ? [components["user-service"]]
    : [];
  const affectedEnvironments = environments["staging"]
    ? [environments["staging"]]
    : [];

  if (affectedComponents.length > 0) {
    incident.affectedComponents = affectedComponents;
  }
  if (affectedEnvironments.length > 0) {
    incident.affectedEnvironments = affectedEnvironments;
  }

  await repo.save(incident);
  console.log(`  Created incident "${incidentTitle}" (P2, resolved)`);
}

/**
 * Seeds tag governance policies for the organization.
 * Uniqueness is checked by (orgId, resourceType).
 */
export async function seedTagPolicy(
  dataSource: DataSource,
  org: Organization,
): Promise<void> {
  const repo = dataSource.getRepository(TagPolicy);

  const policies: Array<{
    resourceType: string;
    requiredKeys: string[];
    severity: "warning" | "error";
  }> = [
    {
      resourceType: "k8s-deployment",
      requiredKeys: [
        "app.kubernetes.io/name",
        "app.kubernetes.io/version",
        "owner",
      ],
      severity: "warning",
    },
    {
      resourceType: "*",
      requiredKeys: ["owner", "team"],
      severity: "warning",
    },
  ];

  for (const policyData of policies) {
    const { resourceType } = policyData;
    const exists = await repo.findOne({
      where: { orgId: org.id, resourceType },
    });
    if (exists) {
      console.log(
        `  TagPolicy for resourceType "${resourceType}" already exists, skipping.`,
      );
      continue;
    }

    const policy = repo.create({
      orgId: org.id,
      resourceType,
      requiredKeys: policyData.requiredKeys,
      severity: policyData.severity,
    });
    await repo.save(policy);
    console.log(`  Created TagPolicy for resourceType "${resourceType}"`);
  }
}
