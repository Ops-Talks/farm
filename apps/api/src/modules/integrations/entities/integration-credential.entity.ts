import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Supported external CI/CD integration types.
 */
export enum IntegrationType {
  ARGOCD = "argocd",
  CIRCLECI = "circleci",
  JENKINS = "jenkins",
  TRAVISCI = "travisci",
  AWS_IAM_ROLE = "aws-iam-role",
  GCP_SERVICE_ACCOUNT = "gcp-service-account",
  AZURE_SERVICE_PRINCIPAL = "azure-service-principal",
  KEYCLOAK = "keycloak",
}

/**
 * Stores encrypted credentials for external CI/CD integrations.
 * The encryptedValue field contains AES-256-GCM ciphertext; the
 * encryption key is derived from the JWT_SECRET environment variable.
 */
@Entity("integration_credentials")
export class IntegrationCredential {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "UUID of the organization this credential belongs to",
    required: false,
    nullable: true,
  })
  @Index()
  @Column({ nullable: true, type: "uuid" })
  orgId: string | null;

  @ApiProperty({
    enum: IntegrationType,
    example: IntegrationType.ARGOCD,
    description: "Integration type",
  })
  @Column({ type: "varchar" })
  type: IntegrationType;

  @ApiProperty({
    example: "production-argocd",
    description: "Human-readable credential name",
  })
  @Column()
  name: string;

  @ApiProperty({
    description: "AES-256-GCM encrypted credential value (base64 encoded)",
  })
  @Column({ type: "text" })
  encryptedValue: string;

  @ApiProperty({
    example: { url: "https://argocd.example.com", username: "admin" },
    description: "Additional non-sensitive metadata for the credential",
    required: false,
    nullable: true,
  })
  @Column("simple-json", { nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Creation timestamp",
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: "2024-01-01T00:00:00Z",
    description: "Last update timestamp",
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
