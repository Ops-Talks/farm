import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for the cookie-based token refresh response.
 *
 * The rotated access and refresh tokens are delivered via httpOnly Set-Cookie
 * headers rather than in the response body.
 */
export class RefreshResponseDto {
  @ApiProperty({
    example: "Token refreshed",
    description: "Human-readable confirmation message",
  })
  message: string;
}
