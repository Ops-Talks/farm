import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  Length,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IntegrationType } from "../entities/integration-credential.entity";

/**
 * DTO for creating a new integration credential.
 * The plainValue is encrypted server-side; it is never persisted as plain text.
 */
export class CreateIntegrationCredentialDto {
  @ApiPropertyOptional({
    example: "550e8400-e29b-41d4-a716-446655440100",
    description: "UUID of the organization this credential belongs to",
  })
  @IsUUID()
  @IsOptional()
  orgId?: string;

  @ApiProperty({
    enum: IntegrationType,
    example: IntegrationType.ARGOCD,
    description: "Integration type",
  })
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @ApiProperty({
    example: "production-argocd",
    description: "Human-readable name for this credential",
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    example: '{"token":"my-api-token","url":"https://argocd.example.com"}',
    description:
      "Plain-text credential value (JSON string). Will be encrypted at rest.",
  })
  @IsString()
  @IsNotEmpty()
  plainValue: string;

  @ApiPropertyOptional({
    example: { url: "https://argocd.example.com", username: "admin" },
    description: "Additional non-sensitive metadata",
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
