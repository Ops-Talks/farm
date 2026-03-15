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
 * Data Transfer Object for the login response.
 */
export class LoginResponseDto {
  @ApiProperty({
    description: "The authenticated user profile",
    type: LoginUserDto,
  })
  user: LoginUserDto;

  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    description: "JWT access token",
  })
  token: string;

  @ApiProperty({
    example: "a1b2c3d4e5f6...",
    description: "Refresh token for obtaining new access tokens",
  })
  refreshToken: string;
}
