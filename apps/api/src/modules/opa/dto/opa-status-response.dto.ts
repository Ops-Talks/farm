import { ApiProperty } from "@nestjs/swagger";

/**
 * Response DTO for the OPA health/status endpoint.
 */
export class OpaStatusResponseDto {
  /** Whether the OPA server is reachable */
  @ApiProperty({ description: "Whether the OPA server is reachable" })
  reachable: boolean;

  /** Configured OPA server URL */
  @ApiProperty({ description: "Configured OPA server URL" })
  url: string;
}
