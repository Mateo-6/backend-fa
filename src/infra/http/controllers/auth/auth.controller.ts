import { Request, Response } from 'express';
import { LoginUserUseCase } from '../../../../application/use-cases/auth/login-user.use-case';
import { LoginDto } from '../../../../domain/auth/dtos/login.dto';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';

/**
 * Controller for handling authentication-related HTTP requests.
 */
export class AuthController {
  private readonly loginUserUseCase: LoginUserUseCase;

  /**
   * @param {LoginUserUseCase} loginUserUseCase Use case for user login operations.
   */
  constructor(loginUserUseCase: LoginUserUseCase) {
    this.loginUserUseCase = loginUserUseCase;
  }

  /**
   * Handles user login requests.
   * Validates credentials and returns a JWT token along with user data.
   *
   * @param {Request} req Express request containing login credentials in the body.
   * @param {Response} res Express response used to return the token and user data.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async login(req: Request, res: Response): Promise<void> {
    // req.body is already validated by the middleware
    const loginDto: LoginDto = req.body;

    try {
      const result = await this.loginUserUseCase.execute(loginDto);
      sendSuccess(res, result);
    } catch (error) {
      // Re-throw as UnauthorizedError if it's not already an AppError
      if (error instanceof Error && !(error as any).statusCode) {
        throw new UnauthorizedError(error.message || 'Invalid credentials');
      }
      throw error;
    }
  }
}

