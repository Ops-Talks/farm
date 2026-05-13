import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import Strategy from "passport-openidconnect";
import type { Profile, VerifyCallback } from "passport-openidconnect";
import {
  IntegrationCredential,
  IntegrationType,
} from "../integrations/entities/integration-credential.entity";
import { AuthService } from "./auth.service";
import * as crypto from "crypto";

/**
 * Shape of the decrypted Keycloak credential JSON payload.
 */
export interface KeycloakCredentialPayload {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

/**
 * AES-256-GCM decryption parameters — must match IntegrationCredentialService.
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Service that constructs a per-org Keycloak OIDC Passport strategy on demand.
 *
 * Because Keycloak configuration (realm, client ID, client secret) is stored
 * per-organization in IntegrationCredential, this service provides a factory
 * method rather than a static strategy registered at module load time.
 */
@Injectable()
export class KeycloakOidcService {
  private readonly logger = new Logger(KeycloakOidcService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(IntegrationCredential)
    private readonly credentialRepository: Repository<IntegrationCredential>,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const jwtSecret =
      this.configService.get<string>("auth.jwtSecret") ??
      "super-secret-key-change-me-in-production";
    // Derive the same 32-byte key used by IntegrationCredentialService.
    this.encryptionKey = crypto.createHash("sha256").update(jwtSecret).digest();
  }

  /**
   * Builds and returns a configured passport-openidconnect Strategy for the
   * given organization, or null when no Keycloak credential is stored for it.
   *
   * @param orgId - UUID of the organization requesting authentication
   * @returns A ready-to-use Strategy instance, or null if not configured
   */
  async getStrategyForOrg(orgId: string): Promise<Strategy | null> {
    const credential = await this.credentialRepository.findOne({
      where: { orgId, type: IntegrationType.KEYCLOAK },
      order: { createdAt: "DESC" },
    });

    if (!credential) {
      this.logger.warn(
        `No Keycloak credential found for org ${orgId} — OIDC login unavailable`,
      );
      return null;
    }

    let payload: KeycloakCredentialPayload;
    try {
      const plainJson = this.decrypt(credential.encryptedValue);
      payload = JSON.parse(plainJson) as KeycloakCredentialPayload;
    } catch (err) {
      this.logger.error(
        `Failed to decrypt Keycloak credential for org ${orgId}`,
        {
          error: err instanceof Error ? err.message : String(err),
          context: "KeycloakOidcService",
        },
      );
      return null;
    }

    const { keycloakUrl, realm, clientId, clientSecret } = payload;
    const issuerBase = `${keycloakUrl}/realms/${realm}`;
    const appUrl =
      this.configService.get<string>("app.url") ||
      `http://localhost:${this.configService.get<number>("port") ?? 3000}`;

    const authService = this.authService;
    const logger = this.logger;

    const strategy = new Strategy(
      {
        issuer: issuerBase,
        authorizationURL: `${issuerBase}/protocol/openid-connect/auth`,
        tokenURL: `${issuerBase}/protocol/openid-connect/token`,
        userInfoURL: `${issuerBase}/protocol/openid-connect/userinfo`,
        clientID: clientId,
        clientSecret,
        callbackURL: `${appUrl}/api/v1/auth/keycloak/callback`,
        scope: ["openid", "email", "profile"],
      },
      (_issuer: string, profile: Profile, done: VerifyCallback) => {
        const id = profile.id ?? "";
        const emails = profile.emails;
        const email = emails?.[0]?.value ?? `${id}@keycloak.oauth`;
        const displayName = profile.displayName ?? id;

        authService
          .findOrCreateOAuthUser("keycloak", id, { email, displayName })
          .then((result) => done(null, result.user))
          .catch((error: unknown) => {
            logger.error("Keycloak OIDC validation failed", error);
            done(error instanceof Error ? error : new Error(String(error)));
          });
      },
    );

    return strategy;
  }

  /**
   * Decrypts an AES-256-GCM encrypted credential value using the derived key.
   * Replicates the logic from IntegrationCredentialService to avoid a circular
   * module dependency.
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
