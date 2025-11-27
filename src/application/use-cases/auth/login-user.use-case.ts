import { UserRepository } from '../../../domain/user/repositories/user.repository';
import { ITokenService } from '../../../domain/auth/services/token-service.interface';
import { IPasswordService } from '../../../domain/auth/services/password-service.interface';
import { LoginDto } from '../../../domain/auth/dtos/login.dto';
import { User } from '../../../domain/user/types/user.types';
import { UnauthorizedError } from '../../../domain/errors/app-error';

/**
 * Response object returned by the login use case.
 */
export interface LoginResponse {
  token: string;
  user: Omit<User, 'password'>;
}

/**
 * Use case for authenticating a user and generating a JWT token.
 * Handles the business logic for user login.
 */
export class LoginUserUseCase {
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
   * @throws {Error} If credentials are invalid or user is not found.
   */
  async execute(loginData: LoginDto): Promise<LoginResponse> {
    // Find user by email
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    if (!user.password) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.compare(
      loginData.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
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
}

