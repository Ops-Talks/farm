import { ApiProperty } from "@nestjs/swagger";

/**
 * Nested representation of the authenticated user returned in the login response.
 */
class LoginUserDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier of the user",
  })
  id: string;

  @ApiProperty({
    example: "john_doe",
    description: "The unique username",
  })
  username: string;

  @ApiProperty({
    example: "john@example.com",
    description: "The user email",
  })
  email: string;

  @ApiProperty({
    example: "John Doe",
    description: "The user display name",
  })
  displayName: string;

  @ApiProperty({
    example: ["admin", "user"],
    description: "The user roles",
  })
  roles: string[];
}

/**
 * Data Transfer Object for the cookie-based login response.
 *
 * Tokens are delivered via httpOnly Set-Cookie headers (access_token,
 * refresh_token) rather than in the response body, so no token fields
 * are present here.
 */
export class LoginResponseDto {
  @ApiProperty({
    example: "Login successful",
    description: "Human-readable confirmation message",
  })
  message: string;

  @ApiProperty({
    description: "The authenticated user profile",
    type: LoginUserDto,
  })
  user: LoginUserDto;
}
