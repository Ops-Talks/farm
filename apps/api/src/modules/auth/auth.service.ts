import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { User } from "./entities/user.entity";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

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

  /**
   * Retrieves the profile of the authenticated user by their ID.
   * @param userId - The authenticated user's UUID
   * @returns The user entity
   * @throws NotFoundException if no user exists with the given ID
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  /**
   * Updates the profile of the authenticated user.
   * @param userId - The authenticated user's UUID
   * @param dto - Fields to update (firstName, lastName, email, gender)
   * @returns The updated user entity
   * @throws NotFoundException if no user exists with the given ID
   * @throws ConflictException if the new email is already taken by another account
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    // Check email uniqueness if changing email
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException("Email already in use");
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.gender !== undefined)
      user.gender = dto.gender as "male" | "female" | "non_binary";

    return this.userRepository.save(user);
  }

  /**
   * Changes the password of the authenticated user.
   * Invalidates all existing sessions by clearing the stored refresh token.
   * @param userId - The authenticated user's UUID
   * @param dto - Current password, new password, and confirmation
   * @throws NotFoundException if no user exists with the given ID
   * @throws BadRequestException if newPassword and confirmPassword do not match
   * @throws UnauthorizedException if the current password is incorrect
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid)
      throw new UnauthorizedException("Current password is incorrect");

    // Assign plain text — @BeforeUpdate hook will hash it
    user.password = dto.newPassword;
    user.refreshToken = null;
    await this.userRepository.save(user);
  }

  /**
   * Finds an existing OAuth user or creates a new one.
   * Used by OAuth2 social login strategies (GitHub, Google).
   * @param provider - OAuth provider name (e.g. "github", "google")
   * @param providerId - Unique user ID from the OAuth provider
   * @param profile - Profile data from the OAuth provider
   * @returns The matched or newly created user along with JWT tokens
   */
  async findOrCreateOAuthUser(
    provider: string,
    providerId: string,
    profile: { email: string; displayName: string; username?: string },
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    let user = await this.userRepository.findOne({
      where: { oauthProvider: provider, oauthProviderId: providerId },
    });

    if (!user) {
      // Fall back to finding by email if user registered normally before
      if (profile.email) {
        user = await this.userRepository.findOne({
          where: { email: profile.email },
        });
      }

      if (user) {
        // Link the existing account to the OAuth provider
        await this.userRepository.update(user.id, {
          oauthProvider: provider,
          oauthProviderId: providerId,
        });
        user.oauthProvider = provider;
        user.oauthProviderId = providerId;
      } else {
        // Create a brand-new user with a random secure password (local login disabled)
        const username =
          profile.username ||
          `${provider}_${providerId}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const safeUsername = await this.ensureUniqueUsername(username);
        const randomPassword = randomBytes(32).toString("hex");

        const newUser = this.userRepository.create({
          username: safeUsername,
          email: profile.email || `${safeUsername}@${provider}.oauth`,
          displayName: profile.displayName || safeUsername,
          password: randomPassword,
          roles: ["user"],
          oauthProvider: provider,
          oauthProviderId: providerId,
        });

        user = await this.userRepository.save(newUser);
      }
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
   * Ensures the given username is unique by appending a suffix if needed.
   * @param base - The base username to check
   * @returns A unique username string
   */
  private async ensureUniqueUsername(base: string): Promise<string> {
    let candidate = base;
    let attempt = 0;
    while (
      await this.userRepository.findOne({ where: { username: candidate } })
    ) {
      attempt++;
      candidate = `${base}_${attempt}`;
    }
    return candidate;
  }
}
