import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { User } from "./entities/user.entity";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";

/**
 * Service handling authentication and user-related business logic.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new user.
   * @param registerUserDto - Registration details
   * @returns The newly created user
   * @throws ConflictException if username or email already exists
   */
  async register(registerUserDto: RegisterUserDto): Promise<User> {
    const { username, email } = registerUserDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ConflictException("Username or email already exists");
    }

    const user = this.userRepository.create({
      ...registerUserDto,
      roles: ["user"],
    });

    return await this.userRepository.save(user);
  }

  /**
   * Authenticates a user and returns a JWT access token plus a refresh token.
   * @param loginDto - Login credentials
   * @returns The user, JWT access token, and refresh token
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(
    loginDto: LoginDto,
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    const { username, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
    };

    const refreshToken = randomBytes(40).toString("hex");
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    return {
      user,
      token: this.jwtService.sign(payload),
      refreshToken,
    };
  }

  /**
   * Refreshes an access token using a valid refresh token.
   * Rotates the refresh token on each use to prevent replay attacks.
   * @param username - The username associated with the refresh token
   * @param refreshToken - The current refresh token
   * @returns A new JWT access token and a rotated refresh token
   * @throws UnauthorizedException if the refresh token is invalid or expired
   */
  async refresh(
    username: string,
    refreshToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      // Possible token reuse attack; invalidate all refresh tokens for this user
      await this.userRepository.update(user.id, {
        refreshToken: undefined,
      });
      throw new UnauthorizedException("Invalid refresh token");
    }

    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
    };

    const newRefreshToken = randomBytes(40).toString("hex");
    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.userRepository.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    return {
      token: this.jwtService.sign(payload),
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Validates a user for Passport strategy.
   * @param username - User's username
   * @param password - User's password
   * @returns The validated user or null
   */
  async validateUser(username: string, pass: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  /**
   * Retrieves all users.
   * @returns An array of all users
   */
  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }
}
