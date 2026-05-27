import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import {
  IntegrationCredential,
  IntegrationType,
} from "./entities/integration-credential.entity";
import { CreateIntegrationCredentialDto } from "./dto/create-integration-credential.dto";
import { UpdateIntegrationCredentialDto } from "./dto/update-integration-credential.dto";

/**
 * Encryption algorithm and parameters used for credential storage.
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCODING = "base64";

/**
 * Service for managing encrypted integration credentials.
 * Encryption uses AES-256-GCM with a key derived from the JWT_SECRET
 * environment variable via SHA-256.
 */
@Injectable()
export class IntegrationCredentialService {
  private readonly logger = new Logger(IntegrationCredentialService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(IntegrationCredential)
    private readonly credentialRepository: Repository<IntegrationCredential>,
    private readonly configService: ConfigService,
  ) {
    const jwtSecret = this.configService.get<string>("auth.jwtSecret") ?? "";
    // Derive a 32-byte key from the JWT secret using SHA-256.
    this.encryptionKey = crypto.createHash("sha256").update(jwtSecret).digest();
  }

  /**
   * Creates and persists a new integration credential.
   * The plainValue is encrypted before storage.
   *
   * @param dto - Credential creation payload
   * @returns The saved credential entity (encryptedValue is opaque ciphertext)
   */
  async create(
    dto: CreateIntegrationCredentialDto,
  ): Promise<IntegrationCredential> {
    const encryptedValue = this.encrypt(dto.plainValue);
    const credential = this.credentialRepository.create({
      orgId: dto.orgId ?? null,
      type: dto.type,
      name: dto.name,
      encryptedValue,
      metadata: dto.metadata ?? null,
    });
    this.logger.log(
      `Creating integration credential: type=${dto.type} name=${dto.name}`,
    );
    return this.credentialRepository.save(credential);
  }

  /**
   * Returns all credentials scoped to the given organization.
   *
   * @param orgId - Organization UUID to filter by
   * @returns Array of matching credentials
   */
  async findAll(orgId?: string): Promise<IntegrationCredential[]> {
    const where = orgId ? { orgId } : {};
    return this.credentialRepository.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Returns a single credential by id and optional orgId.
   *
   * @param id - Credential UUID
   * @param orgId - Optional organization UUID for scoping
   * @returns The found credential entity
   * @throws NotFoundException if no matching credential is found
   */
  async findOne(id: string, orgId?: string): Promise<IntegrationCredential> {
    const where: Record<string, unknown> = { id };
    if (orgId) where["orgId"] = orgId;

    const credential = await this.credentialRepository.findOne({ where });
    if (!credential) {
      throw new NotFoundException(
        `Integration credential with id "${id}" not found`,
      );
    }
    return credential;
  }

  /**
   * Finds the first credential of a given type for an organization.
   * Used by integration services to resolve their active credential.
   *
   * @param orgId - Organization UUID
   * @param type - Integration type to look for
   * @returns The credential entity or null if none is configured
   */
  async findByType(
    orgId: string,
    type: IntegrationType,
  ): Promise<IntegrationCredential | null> {
    return this.credentialRepository.findOne({
      where: { orgId, type },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Updates an existing credential.
   * If plainValue is provided it is re-encrypted before saving.
   *
   * @param id - Credential UUID
   * @param orgId - Optional organization UUID for scoping
   * @param dto - Fields to update
   * @returns The updated credential entity
   * @throws NotFoundException if no matching credential is found
   */
  async update(
    id: string,
    orgId: string | undefined,
    dto: UpdateIntegrationCredentialDto,
  ): Promise<IntegrationCredential> {
    const credential = await this.findOne(id, orgId);

    if (dto.name !== undefined) credential.name = dto.name;
    if (dto.metadata !== undefined) credential.metadata = dto.metadata;
    if (dto.plainValue !== undefined) {
      credential.encryptedValue = this.encrypt(dto.plainValue);
    }

    this.logger.log(`Updating integration credential id=${id}`);
    return this.credentialRepository.save(credential);
  }

  /**
   * Removes a credential by id.
   *
   * @param id - Credential UUID
   * @param orgId - Optional organization UUID for scoping
   * @throws NotFoundException if no matching credential is found
   */
  async remove(id: string, orgId?: string): Promise<void> {
    const credential = await this.findOne(id, orgId);
    await this.credentialRepository.remove(credential);
    this.logger.log(`Removed integration credential id=${id}`);
  }

  /**
   * Decrypts a stored encrypted credential value.
   *
   * @param encryptedValue - Base64-encoded ciphertext (iv + ciphertext + authTag)
   * @returns The original plain-text value
   */
  decrypt(encryptedValue: string): string {
    const buffer = Buffer.from(encryptedValue, ENCODING);
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

  /**
   * Encrypts a plain-text credential value using AES-256-GCM.
   * The returned string encodes iv + ciphertext + authTag as base64.
   *
   * @param plainValue - Plain-text value to encrypt
   * @returns Base64-encoded encrypted payload
   */
  encrypt(plainValue: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    const ciphertext = Buffer.concat([
      cipher.update(plainValue, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, ciphertext]).toString(ENCODING);
  }
}
