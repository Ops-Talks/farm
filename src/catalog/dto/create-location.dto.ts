import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUrl } from "class-validator";

/**
 * Data Transfer Object for creating a new discovery location.
 */
export class CreateLocationDto {
  @ApiProperty({
    description:
      "The URL of the repository to scan for catalog-info.yaml files",
    example: "https://github.com/my-org/my-service.git",
  })
  @IsUrl({ require_tld: false }) // Allow non-domain URLs like localhost
  @IsNotEmpty()
  url: string;
}
