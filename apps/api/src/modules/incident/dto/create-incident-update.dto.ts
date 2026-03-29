import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for creating a manual timeline entry on an incident.
 */
export class CreateIncidentUpdateDto {
  @ApiProperty({
    example: "Scaling database replicas from 2 to 5",
    description: "Free-text message describing the update",
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
