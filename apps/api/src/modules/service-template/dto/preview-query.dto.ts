import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Query parameters for the live preview endpoint.
 */
export class PreviewQueryDto {
  @ApiPropertyOptional({
    example: "eyJTRVJWSUNFX05BTUUiOiJteS1zZXJ2aWNlIn0=",
    description:
      "Base64url-encoded JSON object of template variable key-value pairs",
  })
  @IsString()
  @IsOptional()
  vars?: string;
}
