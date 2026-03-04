import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

/**
 * Data Transfer Object for user registration.
 */
export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;
}
