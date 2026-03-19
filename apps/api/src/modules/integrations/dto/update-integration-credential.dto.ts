import { IsString, IsOptional, IsObject, Length } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for updating an existing integration credential.
 * All fields are optional; only provided fields are changed.
 */
export class UpdateIntegrationCredentialDto {
  @ApiPropertyOptional({
    example: "updated-argocd",
    description: "Updated human-readable name",
  })
  @IsString()
  @IsOptional()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({
    example: '{"token":"new-api-token"}',
    description: "Updated plain-text credential value. Will be re-encrypted.",
  })
  @IsString()
  @IsOptional()
  plainValue?: string;

  @ApiPropertyOptional({
    example: { url: "https://argocd.example.com" },
    description: "Updated non-sensitive metadata",
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
