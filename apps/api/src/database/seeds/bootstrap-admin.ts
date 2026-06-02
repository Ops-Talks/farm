import { QueryFailedError, DataSource, Repository } from "typeorm";
import { User } from "../../modules/auth/entities/user.entity";
import { Organization } from "../../modules/organization/entities/organization.entity";
import { UserOrganization } from "../../modules/organization/entities/user-organization.entity";
import { OrgRole } from "@farm/types";
import dataSource from "./seed.data-source";

/**
 * Creates the initial admin user and, when ADMIN_ORG_NAME is set, an
 * organization with the admin as OWNER.
 *
 * Reads credentials from ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD.
 * Optionally reads ADMIN_ORG_NAME to also create the first organization and
 * enroll the admin as OWNER.
 *
 * Idempotent: skips creation when the username, email, or organization already
 * exist.
 */
export async function runBootstrapAdmin(ds: DataSource): Promise<void> {
  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const orgName = process.env.ADMIN_ORG_NAME;

  if (!username || !email || !password) {
    console.error(
      "ERROR: ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD are all required.",
    );
    process.exit(1);
  }

  const userId = await resolveAdminUser(
    ds.getRepository(User),
    username,
    email,
    password,
  );

  if (orgName) {
    await bootstrapOrganization(ds, userId, orgName);
  }
}

async function resolveAdminUser(
  repo: Repository<User>,
  username: string,
  email: string,
  password: string,
): Promise<string> {
  const existing = await repo.findOne({ where: [{ username }, { email }] });

  if (existing) {
    console.log(
      `Bootstrap admin already exists (username: ${existing.username}). Skipping user creation.`,
    );
    return existing.id;
  }

  const user = repo.create({
    username,
    email,
    displayName: username,
    password,
    roles: ["user", "admin"],
  });

  try {
    const saved = await repo.save(user);
    console.log(`Bootstrap admin user created: ${username}`);
    return saved.id;
  } catch (err) {
    // Handle duplicate-key race from concurrent bootstrap pods.
    if (
      err instanceof QueryFailedError &&
      String((err as Error).message).includes("unique")
    ) {
      console.log(
        "Bootstrap admin already exists (concurrent write resolved). Skipping.",
      );
      const raceUser = await repo.findOne({ where: [{ username }, { email }] });
      if (raceUser) return raceUser.id;
      throw new Error(
        "Bootstrap race condition: user not found after duplicate key error.",
      );
    }
    throw err;
  }
}

async function bootstrapOrganization(
  ds: DataSource,
  userId: string,
  orgName: string,
): Promise<void> {
  const slug = toSlug(orgName);
  const orgRepo = ds.getRepository(Organization);
  const memberRepo = ds.getRepository(UserOrganization);

  let orgId: string;
  const existingOrg = await orgRepo.findOne({
    where: [{ name: orgName }, { slug }],
  });

  if (existingOrg) {
    console.log(
      `Bootstrap organization already exists: ${existingOrg.name}. Skipping org creation.`,
    );
    orgId = existingOrg.id;
    if (!existingOrg.ownerId) {
      await orgRepo.update(orgId, { ownerId: userId });
      console.log(`Patched ownerId on existing organization: ${orgName}`);
    }
  } else {
    const org = orgRepo.create({ name: orgName, slug, ownerId: userId });
    const saved = await orgRepo.save(org);
    orgId = saved.id;
    console.log(`Bootstrap organization created: ${orgName} (slug: ${slug})`);
  }

  const existingMembership = await memberRepo.findOne({
    where: { userId, organizationId: orgId },
  });

  if (existingMembership) {
    console.log(
      `Admin already has membership in "${orgName}". Skipping membership creation.`,
    );
    return;
  }

  const membership = memberRepo.create({
    userId,
    organizationId: orgId,
    role: OrgRole.OWNER,
  });
  await memberRepo.save(membership);
  console.log(`Admin added as OWNER to organization: ${orgName}`);
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function run(): Promise<void> {
  console.log("Starting admin bootstrap...");

  try {
    await dataSource.initialize();
    console.log("Database connection established.");

    await runBootstrapAdmin(dataSource);

    console.log("Bootstrap completed successfully.");
  } catch (error) {
    console.error("Bootstrap failed:", error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void run();
}
