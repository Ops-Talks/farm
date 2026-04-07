import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export enum GenderEnum {
  MALE = "male",
  FEMALE = "female",
  NON_BINARY = "non_binary",
}

/**
 * Data transfer object for updating the authenticated user's profile.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "John" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: "john@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: GenderEnum })
  @IsOptional()
  @IsEnum(GenderEnum)
  gender?: GenderEnum;
}
