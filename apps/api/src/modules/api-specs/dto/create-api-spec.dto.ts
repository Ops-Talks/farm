import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ApiSpecFormat } from "../enums/api-spec-format.enum";

/**
 * Data transfer object for creating a new API specification.
 */
export class CreateApiSpecDto {
  @ApiProperty({ description: "Human-readable name of the API spec" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ApiSpecFormat, description: "Spec format" })
  @IsEnum(ApiSpecFormat)
  format: ApiSpecFormat;

  @ApiProperty({ description: "Semantic version string" })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({ description: "Raw YAML or JSON spec content" })
  @IsString()
  @IsNotEmpty()
  spec: string;
}
