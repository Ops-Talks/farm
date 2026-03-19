import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for resolving a cloud secret reference.
 *
 * Supported ref formats:
 *   arn:aws:secretsmanager:{region}:{account}:secret:{name}
 *   gcp:projects/{project}/secrets/{name}/versions/{version}
 *   azure:{vaultUrl}:{secretName}
 */
export class ResolveSecretDto {
  @ApiProperty({
    description: "Cloud secret reference (AWS ARN, GCP path, or Azure ref)",
    example: "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret",
  })
  @IsString()
  ref: string;

  @ApiProperty({ description: "Organization UUID" })
  @IsString()
  orgId: string;
}
