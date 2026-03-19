import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import * as crypto from "crypto";
import {
  IntegrationCredential,
  IntegrationType,
} from "../integrations/entities/integration-credential.entity";
import { Team } from "../teams/entities/team.entity";
import { User } from "./entities/user.entity";
import { QUEUE_NAMES } from "../../common/queues/queue-names";

/**
 * Shape of the decrypted Keycloak credential JSON payload.
 */
interface KeycloakCredentialPayload {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Keycloak group representation from the Admin REST API.
 */
interface KeycloakGroup {
  id: string;
  name: string;
}

/**
 * Keycloak user representation from the Admin REST API.
 */
interface KeycloakUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Token response from the Keycloak token endpoint.
 */
interface TokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * AES-256-GCM decryption parameters — must match IntegrationCredentialService.
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Job payload for a keycloak-sync BullMQ job.
 */
export interface KeycloakSyncJobData {
  orgId: string;
}

/**
 * Result summary returned from a group sync operation.
 */
export interface KeycloakSyncResult {
  synced: number;
  errors: number;
}

/**
 * Service that synchronizes Keycloak groups to Farm Teams.
 *
 * For each organization that has a Keycloak credential configured, it:
 * 1. Obtains an admin access token via client_credentials grant.
 * 2. Lists all groups from the Keycloak Admin REST API.
 * 3. Finds or creates a Farm Team for each group.
 * 4. Lists members of each group and links matching Farm Users to the team.
 */
@Injectable()
export class KeycloakSyncService {
  private readonly logger = new Logger(KeycloakSyncService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(IntegrationCredential)
    private readonly credentialRepository: Repository<IntegrationCredential>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.KEYCLOAK_SYNC)
    private readonly keycloakSyncQueue: Queue<KeycloakSyncJobData> | null,
  ) {
    const jwtSecret =
      this.configService.get<string>("auth.jwtSecret") ??
      "super-secret-key-change-me-in-production";
    this.encryptionKey = crypto.createHash("sha256").update(jwtSecret).digest();
  }

  /**
   * Synchronizes Keycloak groups to Farm Teams for a single organization.
   *
   * @param orgId - UUID of the organization to sync
   * @returns Summary of groups synced and errors encountered
   */
  async syncOrgGroups(orgId: string): Promise<KeycloakSyncResult> {
    const credential = await this.credentialRepository.findOne({
      where: { orgId, type: IntegrationType.KEYCLOAK },
      order: { createdAt: "DESC" },
    });

    if (!credential) {
      this.logger.warn(
        `No Keycloak credential found for org ${orgId} — skipping sync`,
      );
      return { synced: 0, errors: 0 };
    }

    let payload: KeycloakCredentialPayload;
    try {
      const plainJson = this.decrypt(credential.encryptedValue);
      payload = JSON.parse(plainJson) as KeycloakCredentialPayload;
    } catch (err) {
      this.logger.error(
        `Failed to decrypt Keycloak credential for org ${orgId}`,
        err,
      );
      return { synced: 0, errors: 1 };
    }

    const { keycloakUrl, realm, clientId, clientSecret } = payload;
    const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;
    const adminBase = `${keycloakUrl}/admin/realms/${realm}`;

    // Step 1 — obtain admin access token.
    let adminToken: string;
    try {
      adminToken = await this.fetchAdminToken(tokenUrl, clientId, clientSecret);
    } catch (err) {
      this.logger.error(
        `Failed to obtain Keycloak admin token for org ${orgId}`,
        err,
      );
      return { synced: 0, errors: 1 };
    }

    // Step 2 — list all groups.
    let groups: KeycloakGroup[];
    try {
      groups = await this.fetchJson<KeycloakGroup[]>(
        `${adminBase}/groups`,
        adminToken,
      );
    } catch (err) {
      this.logger.error(
        `Failed to fetch Keycloak groups for org ${orgId}`,
        err,
      );
      return { synced: 0, errors: 1 };
    }

    let synced = 0;
    let errors = 0;

    // Steps 3-6 — process each group.
    for (const group of groups) {
      try {
        // Find or create the Farm Team for this group.
        let team = await this.teamRepository.findOne({
          where: { organizationId: orgId, externalId: group.id },
          relations: ["members"],
        });

        if (!team) {
          team = this.teamRepository.create({
            name: group.name,
            displayName: group.name,
            organizationId: orgId,
            externalId: group.id,
            members: [],
          });
          team = await this.teamRepository.save(team);
        }

        // Fetch group members from Keycloak.
        const members = await this.fetchJson<KeycloakUser[]>(
          `${adminBase}/groups/${group.id}/members`,
          adminToken,
        );

        // Link each member that has a matching Farm User by email.
        for (const member of members) {
          if (!member.email) {
            continue;
          }
          const farmUser = await this.userRepository.findOne({
            where: { email: member.email },
          });
          if (!farmUser) {
            continue;
          }
          const alreadyMember = (team.members ?? []).some(
            (u) => u.id === farmUser.id,
          );
          if (!alreadyMember) {
            team.members = [...(team.members ?? []), farmUser];
          }
        }

        await this.teamRepository.save(team);
        synced++;
      } catch (err) {
        this.logger.error(
          `Error syncing Keycloak group "${group.name}" for org ${orgId}`,
          err,
        );
        errors++;
      }
    }

    this.logger.log(
      `Keycloak sync complete for org ${orgId}: ` +
        `${synced} group(s) synced, ${errors} error(s)`,
    );

    return { synced, errors };
  }

  /**
   * Enqueues a keycloak-sync job for every organization that has a Keycloak
   * credential configured. Called by the hourly cron trigger.
   */
  @Cron("0 * * * *")
  async scheduleAllOrgs(): Promise<void> {
    const credentials = await this.credentialRepository.find({
      where: { type: IntegrationType.KEYCLOAK },
      select: ["orgId"],
    });

    // Deduplicate orgIds (an org may theoretically have multiple credentials).
    const orgIds = Array.from(
      new Set(
        credentials
          .map((c) => c.orgId)
          .filter((id): id is string => id !== null),
      ),
    );

    this.logger.log(
      `Scheduling Keycloak sync for ${orgIds.length} organization(s)`,
    );

    for (const orgId of orgIds) {
      await this.keycloakSyncQueue?.add("sync-org", { orgId });
    }
  }

  /**
   * Obtains a Keycloak admin access token via client_credentials grant.
   *
   * @param tokenUrl - Full token endpoint URL
   * @param clientId - OAuth2 client ID with admin privileges
   * @param clientSecret - OAuth2 client secret
   * @returns The raw access_token string
   */
  async fetchAdminToken(
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(
        `Keycloak token request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TokenResponse;
    return data.access_token;
  }

  /**
   * Performs a GET request to a Keycloak Admin REST API endpoint and returns
   * the parsed JSON response body.
   *
   * @param url - Full URL to call
   * @param token - Bearer token for authorization
   * @returns Parsed JSON body cast to type T
   */
  async fetchJson<T>(url: string, token: string): Promise<T> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Keycloak Admin API request failed: ${response.status} ${response.statusText} — ${url}`,
      );
    }

    return (await response.json()) as T;
  }

  /**
   * Decrypts an AES-256-GCM encrypted credential value using the derived key.
   *
   * @param encryptedValue - Base64-encoded payload: iv(12) + tag(16) + ciphertext
   * @returns The original plain-text string
   */
  private decrypt(encryptedValue: string): string {
    const buffer = Buffer.from(encryptedValue, "base64");
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
}
