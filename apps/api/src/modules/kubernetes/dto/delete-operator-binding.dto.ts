import { IsString, IsNotEmpty, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for removing an operator-to-component binding.
 */
export class DeleteOperatorBindingDto {
  @ApiProperty({
    example: "monitoring",
    description: "Kubernetes namespace where the operator is deployed",
  })
  @IsString()
  @IsNotEmpty()
  operatorNamespace: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440001",
    description: "ID of the component to unbind",
  })
  @IsUUID()
  componentId: string;
}
