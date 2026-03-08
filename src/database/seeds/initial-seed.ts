import { DataSource } from "typeorm";
import { User } from "../../auth/entities/user.entity";
import { Team, TeamType } from "../../teams/entities/team.entity";
import {
  Component,
  ComponentKind,
  ComponentLifecycle,
} from "../../catalog/entities/component.entity";
import {
  Environment,
  EnvironmentType,
} from "../../environments/entities/environment.entity";

/**
 * Runs the initial seed: admin user, 2 teams, 3 components, 2 environments.
 * Idempotent -- skips records that already exist (checked by unique fields).
 */
export async function runInitialSeed(dataSource: DataSource): Promise<void> {
  await seedUsers(dataSource);
  const teams = await seedTeams(dataSource);
  await seedComponents(dataSource, teams);
  await seedEnvironments(dataSource);
}

async function seedUsers(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(User);

  const users = [
    {
      username: "admin",
      email: "admin@farm.dev",
      password: "Admin1234",
      displayName: "Farm Admin",
      roles: ["admin"],
    },
    {
      username: "developer",
      email: "dev@farm.dev",
      password: "Developer1",
      displayName: "Sample Developer",
      roles: ["user"],
    },
  ];

  for (const userData of users) {
    const exists = await repo.findOne({
      where: { username: userData.username },
    });
    if (exists) {
      console.log(`  User "${userData.username}" already exists, skipping.`);
      continue;
    }
    const user = repo.create(userData);
    await repo.save(user);
    console.log(
      `  Created user "${userData.username}" (${userData.roles.join(", ")})`,
    );
  }
}

async function seedTeams(
  dataSource: DataSource,
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
      console.log(`  Team "${teamData.name}" already exists, skipping.`);
    } else {
      team = repo.create(teamData);
      team = await repo.save(team);
      console.log(`  Created team "${teamData.name}"`);
    }
    result[teamData.name] = team;
  }

  return result;
}

async function seedComponents(
  dataSource: DataSource,
  teams: Record<string, Team>,
): Promise<void> {
  const repo = dataSource.getRepository(Component);

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
    const exists = await repo.findOne({
      where: { name: componentData.name },
    });
    if (exists) {
      console.log(
        `  Component "${componentData.name}" already exists, skipping.`,
      );
      continue;
    }
    const component = repo.create(componentData);
    await repo.save(component);
    console.log(
      `  Created component "${componentData.name}" (${componentData.kind})`,
    );
  }
}

async function seedEnvironments(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Environment);

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
    const exists = await repo.findOne({ where: { name: envData.name } });
    if (exists) {
      console.log(`  Environment "${envData.name}" already exists, skipping.`);
      continue;
    }
    const env = repo.create(envData);
    await repo.save(env);
    console.log(`  Created environment "${envData.name}" (${envData.type})`);
  }
}
