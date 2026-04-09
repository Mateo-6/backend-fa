import * as crypto from 'crypto';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { ITokenService } from '../../domain/auth/services/token-service.interface';
import { IPasswordService } from '../../domain/auth/services/password-service.interface';
import { RefreshTokenRepository } from '../../domain/auth/repositories/refresh-token.repository';
import { LoginDto } from '../dto/auth/login.dto';
import { User } from '../../domain/user/types/user.types';
import { UnauthorizedError } from '../../domain/errors/app-error';

/**
 * Response object returned by the authentication service.
 */
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
}

/**
 * Service for managing authentication operations.
 * Orchestrates user authentication, password validation, and token generation.
 */
export class AuthService {
  /**
   * @param {UserRepository} userRepository Repository for user data access.
   * @param {ITokenService} tokenService Service for token generation.
   * @param {IPasswordService} passwordService Service for password comparison.
   * @param {RefreshTokenRepository} refreshTokenRepository Repository for refresh token persistence.
   */
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: ITokenService,
    private readonly passwordService: IPasswordService,
    private readonly refreshTokenRepository: RefreshTokenRepository
  ) {}

  /**
   * Authenticates a user with email and password, returning a JWT token and user data.
   *
   * @param {LoginDto} loginData Email and password for authentication.
   * @returns {Promise<LoginResponse>} Token and user data (without password).
   * @throws {UnauthorizedError} If credentials are invalid or user is not found.
   */
  async login(loginData: LoginDto): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Verify password
    if (!user.password) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const isPasswordValid = await this.passwordService.compare(
      loginData.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    // Generate access token with user id
    const token = this.tokenService.generate({ id: user.id });

    // Generate and persist refresh token (7-day expiry)
    const refreshToken = crypto.randomUUID();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create(user.id!, tokenHash, expiresAt);

    // Return tokens and user data without password
    const { password, ...userWithoutPassword } = user;

    return {
      token,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  /**
   * Issues a new access token given a valid refresh token.
   *
   * @param {string} token Raw refresh token from the client.
   * @returns {Promise<{ token: string }>} New access token.
   * @throws {UnauthorizedError} If the refresh token is invalid or expired.
   */
  async refresh(token: string): Promise<{ token: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const stored = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token inválido o expirado');
    }

    const accessToken = this.tokenService.generate({ id: stored.userId });

    return { token: accessToken };
  }

  /**
   * Handles user logout.
   * In a stateless JWT system, logout is primarily handled client-side.
   * This method provides a server-side confirmation endpoint.
   *
   * @param {string} userId User ID from the authenticated request.
   * @returns {Promise<{ message: string }>} Success message confirming logout.
   */
  /**
   * Handles user logout. If a refresh token is provided, invalidates it.
   *
   * @param {string} userId User ID from the authenticated request.
   * @param {string} [refreshToken] Optional raw refresh token to invalidate.
   * @returns {Promise<{ message: string }>} Success message confirming logout.
   */
  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.refreshTokenRepository.deleteByHash(tokenHash);
    }
    return {
      message: 'Logout successful',
    };
  }
}

