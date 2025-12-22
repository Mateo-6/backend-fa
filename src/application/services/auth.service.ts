import { UserRepository } from '../../domain/user/repositories/user.repository';
import { ITokenService } from '../../domain/auth/services/token-service.interface';
import { IPasswordService } from '../../domain/auth/services/password-service.interface';
import { LoginDto } from '../dto/auth/login.dto';
import { User } from '../../domain/user/types/user.types';
import { UnauthorizedError } from '../../domain/errors/app-error';

/**
 * Response object returned by the authentication service.
 */
export interface LoginResponse {
  token: string;
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
   */
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: ITokenService,
    private readonly passwordService: IPasswordService
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

    // Generate token with user id
    const token = this.tokenService.generate({ id: user.id });

    // Return token and user data without password
    const { password, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword,
    };
  }

  /**
   * Handles user logout.
   * In a stateless JWT system, logout is primarily handled client-side.
   * This method provides a server-side confirmation endpoint.
   *
   * @param {string} userId User ID from the authenticated request.
   * @returns {Promise<{ message: string }>} Success message confirming logout.
   */
  async logout(userId: string): Promise<{ message: string }> {
    // In a stateless JWT system, logout is handled client-side
    // This endpoint provides confirmation and can be extended for token blacklisting
    return {
      message: 'Logout successful',
    };
  }
}

