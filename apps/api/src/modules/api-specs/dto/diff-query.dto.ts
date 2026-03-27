import { IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Query parameters for the spec diff endpoint.
 */
export class DiffQueryDto {
  @ApiProperty({ description: "UUID of the API spec to compare against" })
  @IsUUID()
  compareWith: string;
}
