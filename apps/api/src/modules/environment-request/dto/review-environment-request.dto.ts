import { IsString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for reviewing (approving or rejecting) an environment request.
 */
export class ReviewEnvironmentRequestDto {
  @ApiPropertyOptional({
    example: "Approved for staging use. Please clean up after testing.",
    description: "Optional review comment from the admin",
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
