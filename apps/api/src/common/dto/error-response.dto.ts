import { ApiProperty } from "@nestjs/swagger";

/**
 * Standardized error response object for API consumers.
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: "HTTP Status Code" })
  statusCode: number;

  @ApiProperty({
    example: "2023-10-27T10:00:00.000Z",
    description: "ISO Timestamp of the error",
  })
  timestamp: string;

  @ApiProperty({
    example: "/api/resource",
    description: "The path where the error occurred",
  })
  path: string;

  @ApiProperty({
    example: "Validation failed",
    description: "Error message or description",
  })
  message: string | string[];
}
