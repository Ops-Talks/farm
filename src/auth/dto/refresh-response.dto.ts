import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for the refresh token response.
 */
export class RefreshResponseDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    description: "New JWT access token",
  })
  token: string;

  @ApiProperty({
    example: "a1b2c3d4e5f6...",
    description: "New rotated refresh token",
  })
  refreshToken: string;
}
