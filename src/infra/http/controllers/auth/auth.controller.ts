import { Request, Response } from 'express';
import { AuthService } from '../../../../application/services/auth.service';
import { LoginDto } from '../../../../application/dto/auth/login.dto';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { AuthenticatedRequest } from '../../types/request.types';

/**
 * Controller for handling authentication-related HTTP requests.
 */
export class AuthController {
  private readonly authService: AuthService;

  /**
   * @param {AuthService} authService Service for authentication operations.
   */
  constructor(authService: AuthService) {
    this.authService = authService;
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
      const result = await this.authService.login(loginDto);
      sendSuccess(res, result);
    } catch (error) {
      // Re-throw as UnauthorizedError if it's not already an AppError
      if (error instanceof Error && !(error as any).statusCode) {
        throw new UnauthorizedError(error.message || 'Credenciales inválidas');
      }
      throw error;
    }
  }

  /**
   * Handles user logout requests.
   * Returns a success message confirming logout.
   * The client should remove the token from storage.
   *
   * @param {Request} req Express request containing authenticated user info.
   * @param {Response} res Express response used to return the logout confirmation.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async logout(req: Request, res: Response): Promise<void> {
    const authenticatedReq = req as AuthenticatedRequest;
    const userId = authenticatedReq.user?.id;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await this.authService.logout(userId);
    sendSuccess(res, result);
  }
}

