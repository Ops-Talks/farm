import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Payload for linking an IaC module to a catalog component.
 */
export class LinkComponentDto {
  @ApiProperty({
    example: "comp-uuid-1234",
    description: "UUID of the catalog component to associate with this module",
  })
  @IsString()
  @IsNotEmpty()
  componentId: string;
}
