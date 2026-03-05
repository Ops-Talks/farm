import { ApiProperty } from "@nestjs/swagger";

/**
 * Represents a user in the Farm system.
 */
export class User {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique identifier",
  })
  id: string;

  @ApiProperty({ example: "john_doe", description: "The unique username" })
  username: string;

  @ApiProperty({ example: "john@example.com", description: "The user email" })
  email: string;

  @ApiProperty({ example: "John Doe", description: "The user display name" })
  displayName: string;

  @ApiProperty({ example: ["admin", "user"], description: "The user roles" })
  roles: string[];

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The creation date",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2023-01-01T00:00:00Z",
    description: "The last update date",
  })
  updatedAt: Date;
}
