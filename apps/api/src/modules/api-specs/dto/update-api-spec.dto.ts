import { IsEnum, IsISO8601, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ApiSpecStatus } from "../enums/api-spec-status.enum";

/**
 * Data transfer object for updating an existing API specification.
 * All fields are optional.
 */
export class UpdateApiSpecDto {
  @ApiPropertyOptional({
    enum: ApiSpecStatus,
    description: "New lifecycle status",
  })
  @IsOptional()
  @IsEnum(ApiSpecStatus)
  status?: ApiSpecStatus;

  @ApiPropertyOptional({ description: "ISO-8601 sunset timestamp" })
  @IsOptional()
  @IsISO8601()
  sunsetAt?: string;

  @ApiPropertyOptional({ description: "ISO-8601 deprecated timestamp" })
  @IsOptional()
  @IsISO8601()
  deprecatedAt?: string;
}
