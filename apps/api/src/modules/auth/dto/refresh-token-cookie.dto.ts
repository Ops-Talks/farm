import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Body DTO for the cookie-based token refresh endpoint.
 *
 * Both fields are optional because:
 * - `refreshToken` is now read from the `refresh_token` httpOnly cookie.
 * - `username` is extracted from the (possibly expired) `access_token` cookie
 *   payload when not provided in the body.
 *
 * API clients and e2e tests may still supply either field in the request body
 * as a backward-compatible fallback.
 */
export class RefreshTokenCookieDto {
  @ApiPropertyOptional({
    example: "john_doe",
    description:
      "Username associated with the refresh token. " +
      "Optional when an access_token cookie is present (username is decoded from it).",
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    example: "a1b2c3d4e5f6...",
    description:
      "Refresh token. Optional when the refresh_token httpOnly cookie is set by the browser.",
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
