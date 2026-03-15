import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Data Transfer Object for user registration.
 */
export class RegisterUserDto {
  @ApiProperty({
    example: "john_doe",
    description: "The unique username (2-50 characters)",
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  username: string;

  @ApiProperty({
    example: "john@example.com",
    description: "The user email address",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "StrongPass1",
    description:
      "The user password (min 8 characters, must contain uppercase, lowercase, and number)",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password: string;

  @ApiProperty({ example: "John Doe", description: "The full display name" })
  @IsString()
  @IsNotEmpty()
  displayName: string;
}
