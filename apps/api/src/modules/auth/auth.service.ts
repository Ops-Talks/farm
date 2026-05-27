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
import { randomBytes, createHash, randomUUID } from "crypto";
import { User } from "./entities/user.entity";
import { RefreshToken } from "./entities/refresh-token.entity";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { BCRYPT_ROUNDS } from "../../common/constants/bcrypt";

/**
 * A pre-computed bcrypt hash used as a dummy target when the requested
 * username does not exist.  Running compare() against this constant ensures
 * that every code path through validateUser() takes a full bcrypt round,
 * preventing a timing oracle that would reveal valid usernames.
 */
const DUMMY_HASH =
  "$2b$12$K9DJCHZGHoSOFwqB5RJwNeDWGjGGBbM2O.vE4G3K5R6YFP.YV74Yy";

/**
 * Service handling authentication and user-related business logic.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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
   * The refresh token is stored in the dedicated refresh_tokens table (hashed)
   * so that multiple devices can hold independent tokens simultaneously.
   * @param loginDto - Login credentials
   * @param meta - Optional request metadata attached to the token record
   * @returns The user, JWT access token, and raw refresh token
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(
    loginDto: LoginDto,
    meta: { userAgent?: string; ip?: string } = {},
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    const { username, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.suspended) {
      throw new UnauthorizedException("Account suspended");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
      tokenVersion: user.tokenVersion,
    };

    await this.userRepository.update(user.id, { lastLogin: new Date() });

    const rawRefreshToken = await this.createRefreshToken(user.id, meta);

    return {
      user,
      token: this.jwtService.sign(payload),
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Refreshes an access token using a raw refresh token.
   * Implements token-family invalidation: if a revoked token is presented,
   * all tokens in the same family are immediately revoked (reuse detection).
   * @param rawToken - The raw (unhashed) refresh token from the cookie
   * @returns A new JWT access token and a rotated refresh token
   * @throws UnauthorizedException if the token is invalid, expired, or reused
   */
  async refresh(
    rawToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const jti = this.hashToken(rawToken);
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { jti },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Reuse detection: a revoked token was presented — invalidate the whole family
    if (tokenRecord.revokedAt !== null) {
      await this.revokeFamilyTokens(tokenRecord.familyId);
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.refreshTokenRepository.update(
        { id: tokenRecord.id },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException("Refresh token expired");
    }

    // Revoke the consumed token before issuing the successor
    await this.refreshTokenRepository.update(
      { id: tokenRecord.id },
      { revokedAt: new Date() },
    );

    const user = await this.userRepository.findOne({
      where: { id: tokenRecord.userId },
    });
    if (!user) throw new UnauthorizedException("User not found");

    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
      tokenVersion: user.tokenVersion,
    };

    const newRawToken = await this.createRefreshToken(user.id, {
      userAgent: tokenRecord.userAgent ?? undefined,
      ip: tokenRecord.ip ?? undefined,
      familyId: tokenRecord.familyId,
    });

    return {
      token: this.jwtService.sign(payload),
      refreshToken: newRawToken,
    };
  }

  /**
   * Revokes the refresh token stored in the cookie so the device is signed out.
   * Best-effort: if the token cannot be found the call is silently ignored so
   * that clearing the cookie on the client side is always the authoritative
   * logout action.
   * @param rawToken - The raw refresh token from the cookie (may be undefined)
   */
  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    const jti = this.hashToken(rawToken);
    await this.refreshTokenRepository.update(
      { jti },
      { revokedAt: new Date() },
    );
  }

  /**
   * Validates a user for Passport local strategy.
   * Runs a constant-time bcrypt comparison even when the username does not
   * exist, preventing a timing oracle that would reveal valid usernames.
   * If the stored hash was produced with a lower cost than BCRYPT_ROUNDS, the
   * password is transparently re-hashed on the next successful login.
   * @param username - User's username
   * @param pass - Plaintext password attempt
   * @returns The validated user or null
   */
  async validateUser(username: string, pass: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      // Always run a full bcrypt round to prevent username enumeration via timing.
      await bcrypt.compare(pass, DUMMY_HASH);
      return null;
    }
    if (!(await bcrypt.compare(pass, user.password))) {
      return null;
    }
    // Transparently upgrade hashes that were stored with an older cost factor.
    if (bcrypt.getRounds(user.password) < BCRYPT_ROUNDS) {
      user.password = await bcrypt.hash(pass, BCRYPT_ROUNDS);
      await this.userRepository.save(user);
    }
    return user;
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
    if (dto.gender !== undefined) user.gender = dto.gender;

    return this.userRepository.save(user);
  }

  /**
   * Changes the password of the authenticated user.
   * Increments tokenVersion so all outstanding JWTs are immediately
   * invalidated, and revokes every refresh token in the database for the user.
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

    // Assign plain text — @BeforeUpdate hook will hash it.
    // Increment tokenVersion to invalidate all existing access-tokens.
    user.password = dto.newPassword;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.userRepository.save(user);
    await this.revokeAllUserTokens(userId);
  }

  /**
   * Finds an existing OAuth user or creates a new one.
   * Used by OAuth2 social login strategies (GitHub, Google, LDAP, Keycloak).
   * @param provider - OAuth provider name (e.g. "github", "google", "ldap")
   * @param providerId - Unique user ID from the OAuth provider
   * @param profile - Profile data from the OAuth provider
   * @returns The matched or newly created user along with JWT tokens
   */
  async findOrCreateOAuthUser(
    provider: string,
    providerId: string,
    profile: {
      email: string;
      displayName: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      roles?: string[];
    },
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
          roles: profile.roles ?? ["user"],
          oauthProvider: provider,
          oauthProviderId: providerId,
          ...(profile.firstName ? { firstName: profile.firstName } : {}),
          ...(profile.lastName ? { lastName: profile.lastName } : {}),
        });

        user = await this.userRepository.save(newUser);
      }
    }

    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
      tokenVersion: user.tokenVersion,
    };

    const rawRefreshToken = await this.createRefreshToken(user.id, {});

    return {
      user,
      token: this.jwtService.sign(payload),
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Generates a fresh JWT access token and a rotated refresh token for an
   * already-authenticated user. Intended for use by non-OAuth login flows
   * such as LDAP that resolve the user through a Passport strategy.
   * @param user - The authenticated user entity
   * @returns The user, a signed JWT, and a new refresh token
   */
  async generateTokensForUser(
    user: User,
  ): Promise<{ user: User; token: string; refreshToken: string }> {
    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
      tokenVersion: user.tokenVersion,
    };
    const rawRefreshToken = await this.createRefreshToken(user.id, {});
    return {
      user,
      token: this.jwtService.sign(payload),
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Revokes all active refresh tokens for a given user.
   * Called on password change, account suspension, and admin password reset.
   * @param userId - The user's UUID
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where("userId = :userId AND revokedAt IS NULL", { userId })
      .execute();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Creates a new RefreshToken record and returns the raw (unhashed) token.
   */
  private async createRefreshToken(
    userId: string,
    meta: { userAgent?: string; ip?: string; familyId?: string },
  ): Promise<string> {
    const rawToken = randomBytes(40).toString("hex");
    const jti = this.hashToken(rawToken);
    const familyId = meta.familyId ?? randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const record = this.refreshTokenRepository.create({
      userId,
      jti,
      familyId,
      issuedAt: now,
      expiresAt,
      revokedAt: null,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    });
    await this.refreshTokenRepository.save(record);
    return rawToken;
  }

  /**
   * Revokes all tokens that belong to the given token family.
   * Used when a reused (already-revoked) token is presented.
   */
  private async revokeFamilyTokens(familyId: string): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where("familyId = :familyId AND revokedAt IS NULL", { familyId })
      .execute();
  }

  /**
   * Returns the SHA-256 hex digest of a raw token string.
   * This is stored as the jti (JWT ID) in the refresh_tokens table so the
   * plaintext token never touches the database.
   */
  private hashToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
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
