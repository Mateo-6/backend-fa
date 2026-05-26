import { Request, Response } from 'express';
import { AuthService } from '../../../../application/services/auth.service';
import { LoginDto } from '../../../../application/dto/auth/login.dto';
import { UnauthorizedError } from '../../../../domain/errors/app-error';
import { sendSuccess } from '../../utils/response.util';
import { AuthenticatedRequest } from '../../types/request.types';
import { logger } from '../../../utils/logger';

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
    const { requestId } = req as AuthenticatedRequest;
    const loginDto: LoginDto = req.body;

    logger.info('Login attempt', { requestId, email: loginDto.email });

    try {
      const result = await this.authService.login(loginDto);
      logger.info('Login successful', { requestId, email: loginDto.email });
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
   * Issues a new access token given a valid refresh token.
   *
   * @param {Request} req Express request containing the refresh token in the body.
   * @param {Response} res Express response used to return the new access token.
   * @returns {Promise<void>} Resolves when the response is sent.
   */
  public async refresh(req: Request, res: Response): Promise<void> {
    const { requestId } = req as AuthenticatedRequest;
    logger.info('Refreshing access token', { requestId });

    const { refreshToken } = req.body;
    const result = await this.authService.refresh(refreshToken);
    sendSuccess(res, result);
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
    const { requestId } = authenticatedReq;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    logger.info('Logout', { requestId, userId });
    const result = await this.authService.logout(userId, req.body?.refreshToken);
    sendSuccess(res, result);
  }
}
