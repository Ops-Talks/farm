import { IsNotEmpty, IsString } from "class-validator";

/**
 * Data Transfer Object for user login.
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
