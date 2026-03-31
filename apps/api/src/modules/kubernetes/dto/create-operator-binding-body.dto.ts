import { IsString, IsNotEmpty, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Request body DTO for creating an operator-to-component binding.
 * The operator name is supplied via the `:name` route path parameter,
 * and the organization is inferred from the authenticated request.
 */
export class CreateOperatorBindingBodyDto {
  @ApiProperty({ example: "monitoring" })
  @IsString()
  @IsNotEmpty()
  operatorNamespace: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  @IsUUID()
  componentId: string;
}
