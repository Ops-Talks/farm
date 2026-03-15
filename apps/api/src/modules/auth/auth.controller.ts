import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { RefreshResponseDto } from "./dto/refresh-response.dto";
import { User } from "./entities/user.entity";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller for authentication and user management operations.
 */
@ApiTags("Authentication")
@Controller("auth")
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user account.
   * @param registerUserDto - Registration data
   * @returns The created user profile
   */
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: "Register a new user" })
  @ApiHeader({
    name: "X-RateLimit-Limit",
    description: "Maximum 5 requests per minute",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "The user has been successfully registered.",
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "User already exists.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Too many requests. Rate limit: 5 per minute.",
    type: ErrorResponseDto,
  })
  async register(@Body() registerUserDto: RegisterUserDto): Promise<User> {
    return await this.authService.register(registerUserDto);
  }

  /**
   * Authenticates a user and returns an access token with a refresh token.
   * @param loginDto - Login credentials
   * @returns The authenticated user, access token, and refresh token
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: "User login" })
  @ApiHeader({
    name: "X-RateLimit-Limit",
    description: "Maximum 5 requests per minute",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Successfully authenticated. Returns access token and refresh token.",
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid credentials.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Too many requests. Rate limit: 5 per minute.",
    type: ErrorResponseDto,
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return await this.authService.login(loginDto);
  }

  /**
   * Refreshes an access token using a valid refresh token.
   * The refresh token is rotated on each use.
   * @param refreshTokenDto - Username and current refresh token
   * @returns A new access token and rotated refresh token
   */
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: "Refresh access token" })
  @ApiHeader({
    name: "X-RateLimit-Limit",
    description: "Maximum 10 requests per minute",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      "Successfully refreshed. Returns new access token and rotated refresh token.",
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Invalid or expired refresh token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: "Too many requests. Rate limit: 10 per minute.",
    type: ErrorResponseDto,
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshResponseDto> {
    return await this.authService.refresh(
      refreshTokenDto.username,
      refreshTokenDto.refreshToken,
    );
  }

  /**
   * Retrieves all registered users.
   * @returns An array of all user profiles
   */
  @Get("users")
  @ApiOperation({ summary: "Get all users" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Return all users.",
    type: [User],
  })
  async findAll(): Promise<User[]> {
    return await this.authService.findAll();
  }
}
