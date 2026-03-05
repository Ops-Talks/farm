import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for user registration.
 */
export class RegisterUserDto {
  @ApiProperty({ example: "john_doe", description: "The unique username" })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: "john@example.com",
    description: "The user email address",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "strongpassword123",
    description: "The user password (min 8 characters)",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: "John Doe", description: "The full display name" })
  @IsString()
  @IsNotEmpty()
  displayName: string;
}
